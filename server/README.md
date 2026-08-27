# MediScribe server

Voice → SOAP note backend. Express + Groq, no database, nothing persisted.

## Run

```bash
cp .env.example .env   # then paste your Groq key
npm install
npm start
```

It prints both `http://localhost:3000` and the LAN address to use from a phone.

## Routes

| Route | Purpose |
|---|---|
| `GET /health` | Liveness + the model IDs currently configured |
| `POST /api/process-voice` | `multipart/form-data`, single field `audio` (≤25 MB) |
| `POST /api/process-document` | `multipart/form-data`, single field `document` (≤15 MB), PNG/JPEG/WebP or PDF |
| `GET /samples/…` | Synthetic fixtures, so the pipeline can be exercised without a mic or camera |

```bash
curl -F "audio=@samples/visit.m4a" http://localhost:3000/api/process-voice
```

`samples/visit.m4a` is a synthetic 75-second consultation generated with macOS
`say`. It is not a real patient.

Success shape:

```jsonc
{
  "success": true,
  "data": {
    "soap_note": {
      "subjective": [{ "text": "...", "source_segment_ids": [1] }],
      "objective": [], "assessment": [], "plan": []
    },
    "segments": [{ "id": 0, "start": 0, "end": 4.2, "text": "..." }],
    "meta": { "llm_attempts": 1, "invalid_segment_ids_dropped": 0, "latency_ms": {} }
  }
}
```

Failures the user can cause (too short, rate limited, silent audio) return HTTP
200 with `success: false` and a readable `error`. Only genuine server faults
return 500.

## Model IDs rotate

They live in `.env`, never in code, because Groq retires them without notice.
As of the last run, `llama-3.3-70b-versatile` and
`meta-llama/llama-4-scout-17b-16e-instruct` — both named in the PRD — no longer
exist on the API. Current config uses `openai/gpt-oss-120b` for text.

List what your key can actually reach:

```bash
node -e "require('dotenv').config();const G=require('groq-sdk');new G({apiKey:process.env.GROQ_API_KEY}).models.list().then(r=>console.log(r.data.map(m=>m.id).sort().join('\n')))"
```

## Why the segment ids are quoted strings

The PRD's Appendix A schema asks for `"source_segment_ids": [0, 1]`. In JSON
mode the model drops the array separators often enough to matter — emitting
`[14781011]` where it meant `[1,4,7,8,10,11]`. Those ids fail validation, and
the bullet reaches the UI with no evidence link at all, which is the one thing
this demo exists to show.

Asking for `["0", "1"]` makes the concatenation impossible. Measured over 10
runs of the same recording: 5/10 runs corrupted before, 0/10 after. The server
coerces them back to integers, so the API contract is unchanged.

## Uploading from the app: not the React Native idiom

The usual React Native file upload does **not** work on Expo SDK 54+:

```js
form.append('audio', { uri, name, type }); // throws before the request is sent
```

Expo replaces the global `fetch` with a WinterCG implementation whose FormData
converter accepts only a string, a real `Blob`, or an object exposing
`bytes()`. The `{ uri, ... }` shorthand raises `Unsupported FormDataPart
implementation`, so nothing reaches the network and it looks exactly like the
server being unreachable.

`expo-file-system`'s `File` exposes `bytes()`, but it is not `instanceof Blob`,
so `append(name, value, filename)` silently drops the filename — and without a
filename in the content-disposition header, multer treats the part as an
ordinary text field and never populates `req.file`. Both halves are handled in
`mediscribe/src/lib/api.ts`.

## The vision model, and why reasoning is switched off

Groq no longer offers `meta-llama/llama-4-scout-17b-16e-instruct`, the
multimodal model named in the PRD. Nothing in the model list is advertised as
multimodal, but `qwen/qwen3.6-27b` accepts `image_url` content blocks and reads
a lab table accurately — worth testing for rather than trusting the naming.

It is a reasoning model, and that is a problem for extraction. Left at default,
reasoning tokens compete with the answer: the model reads the top of the table,
spends its budget thinking, and stops. Measured on the same report, five runs
each:

| `reasoning_effort` | Parameters found | Questions generated |
|---|---|---|
| default | 3-6 of 7, never all | 0 every time |
| `none` | 7 of 7, five times out of five | 3 every time |

Only `none` and `default` are accepted for this model. The image call sends
`reasoning_effort: 'none'`, and drops the parameter and retries if a future
model rejects it.

## The pdf-parse trap has moved

The PRD says to import `pdf-parse/lib/pdf-parse.js` directly to dodge a debug
block that reads a test file on import. That was v1. v2 declares `exports`, so
that subpath no longer resolves at all — `ERR_PACKAGE_PATH_NOT_EXPORTED`. The
v2 equivalent is the `PDFParse` class, used in `routes/document.js`.

## Measurements

Ten runs of `samples/visit.m4a` (75 s of audio, 18 segments):

| Metric | Result |
|---|---|
| JSON parse success (KR2) | 10/10, zero retries needed |
| Invalid segment ids after filtering | 0 |
| Bullets with no evidence link | 0 of 93 |
| Latency min / median / max (KR1) | 3.9 s / 4.9 s / 10.2 s |

Evidence correctness (assumption A4) was checked by hand on one run: all 13
bullets cited a segment that genuinely supports the claim. The model tends to
cite one segment where two would be better, because Whisper splits sentences
mid-clause.
