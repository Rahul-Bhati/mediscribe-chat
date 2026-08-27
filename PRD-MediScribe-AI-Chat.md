# PRD — MediScribe AI Chat (MVP)

**Version:** 1.0
**Date:** 17 August 2026
**Status:** Ready to build
**Budget:** $0.00 (free API tiers only)

---

## ⚠️ Read this first — corrections to the original spec

Four things in the earlier draft will break your build. They are fixed throughout this document.

| Item in original draft | Problem | What this PRD uses instead |
|---|---|---|
| `llama-3.3-70b-speculator` | Not a real Groq model ID. The API returns a 404 `model_not_found`. | `llama-3.3-70b-versatile` |
| `llama-3.2-11b-vision-preview` | Groq retired its `-preview` vision models. Preview IDs get decommissioned without notice. | `meta-llama/llama-4-scout-17b-16e-instruct` (multimodal, free tier) |
| `expo-av` | Deprecated from Expo SDK 53 onward; removed in later SDKs. | `expo-audio` (the official replacement) |
| "`groq-sdk`: Meta's official wrapper" | `groq-sdk` is Groq's SDK, not Meta's. Llama is Meta's model; Groq is the host. | Same package, correct attribution |

**Before you write a line of code**, open <https://console.groq.com/docs/models> and confirm the three model IDs above still exist. Groq rotates models. Put them in `.env` as variables, never hardcoded, so a rotation is a one-line fix.

---

## 1. Summary

MediScribe AI Chat is a single-screen mobile chat app that turns a spoken doctor–patient conversation into a structured clinical SOAP note, and turns a photo of a lab report into a plain-English explanation. Every line of the generated note is tappable and highlights the exact words in the raw transcript that produced it.

It is a portfolio demo built to show, in one screen, that the builder can handle a real multi-step AI pipeline — audio in, structured JSON out, mapped back to source evidence in the UI.

---

## 2. Contacts

| Name | Role | Comment |
|---|---|---|
| Rahul | Builder / sole engineer | Owns frontend, backend, and prompt design |
| — | Reviewer (interviewer) | Primary audience for the demo |
| Groq | Infrastructure provider | Free developer tier; no credit card required |

---

## 3. Background

**What this is about.** Doctors spend a large share of each day typing notes instead of talking to patients. Companies like Abridge record the visit and write the note automatically. The hard part is not transcription — it is trust. A doctor will not sign a note they cannot verify. So the note must point back to the exact spoken words behind each line.

**Why this is possible now.** Two things changed. First, open models like Meta's Llama 3.3 got good enough at following strict output formats to reliably return valid JSON. Second, Groq made those models free to use through a developer tier, running on custom hardware fast enough that a two-minute recording is processed in a few seconds. Two years ago this demo cost money and took a long round-trip. Today it costs nothing.

**Why build it as a demo.** A résumé claim is weak. A working app where you press a mic button, speak for forty seconds, and get back a tappable, source-linked clinical note is not.

---

## 4. Objective

**The objective:** ship a working mobile app that demonstrates the full ambient-documentation loop — record → transcribe → structure → link to evidence → display — in under 12 hours of build time and at zero cost.

**Why it matters:** it converts an abstract interest in clinical AI into something a reviewer can hold and press. The linked-evidence feature is the specific thing that separates a toy transcription wrapper from an understanding of what the product category actually requires.

### Key Results

| # | Key Result | Target | How to measure |
|---|---|---|---|
| KR1 | End-to-end voice latency | Under 10 seconds for a 60-second recording | Log timestamps at request start and response render |
| KR2 | JSON parse success rate | 19 out of 20 requests parse without error | Run 20 test recordings, count `JSON.parse` failures |
| KR3 | Evidence-link accuracy | Every bullet has at least one valid segment ID that actually exists in the transcript | Manual review of 10 generated notes |
| KR4 | Cost | $0.00 | Groq console billing page |
| KR5 | Cold-start demo | A stranger can record and see a note without instructions | Hand the phone to someone; watch |

---

## 5. Market Segment

This is a demo, so the "market" is the reviewer. But the product it imitates serves a real segment, and the demo should be designed as if for them.

**Primary segment — the clinician who resents the keyboard.** Their job: finish documentation without staying late, and without signing anything they have not verified. Their constraint: they will not trust a note they cannot audit. This is why linked evidence, not transcription quality, is the centrepiece.

**Secondary segment — the patient holding a lab report they cannot read.** Their job: understand whether a number is a problem, and know what to ask their doctor. Their constraint: they are anxious, not medically trained, and a wrong reassurance is harmful.

**Constraints that apply to both:**
- No login. Friction kills a demo.
- No storage of health data. Nothing persists past the session.
- This is not a medical device and must say so on screen.

---

## 6. Value Proposition

**For the clinician persona:**
- *Gain:* a structured, standard-format SOAP note from a normal conversation, with no typing.
- *Pain avoided:* re-reading a transcript to check whether the AI invented something. Tap the line, see the source.
- *Better than the obvious alternative:* a plain transcription app gives you a wall of text. A plain LLM summary gives you something confident and unverifiable. This gives you a note plus its receipts.

**For the patient persona:**
- *Gain:* plain-language meaning for each abnormal value, and specific questions to bring to their doctor.
- *Pain avoided:* searching a lab value online and landing on the worst possible answer.
- *Deliberately not offered:* a diagnosis. The output frames questions, it does not answer them.

---

## 7. Solution

### 7.1 UX

Single screen. Nothing else.

```
+------------------------------------------+
|            MediScribe AI Chat            |
+------------------------------------------+
|                                          |
|  [AI]: Welcome. Tap the mic to dictate,  |
|  or the paperclip to upload a lab report.|
|                                          |
|  [User]: 🎤 Audio message — 0:42         |
|                                          |
|  [AI]: Generated SOAP Note               |
|  ---------------------------------------  |
|  SUBJECTIVE                              |
|  • Chest tightness x3 days, radiating    |
|    to left shoulder.               [1,2] |
|  • No prior cardiac history.         [5] |
|                                          |
|  PLAN                                    |
|  • Refer to cardiology.             [11] |
|  ---------------------------------------  |
|  TRANSCRIPT                              |
|  [1] "my chest has been tight since..."  |
|      ^^ highlighted yellow when tapped   |
|  [2] "...goes up into my shoulder"       |
|                                          |
+------------------------------------------+
| [📎]  [ Type a message...        ]  [🎤] |
+------------------------------------------+
```

**Interaction rules:**
1. The mic button replaces the send button when the input box is empty. Type something, it becomes a send arrow. This is the WhatsApp pattern; it needs no explanation.
2. Tap and hold to record, release to stop — or tap once to start, tap again to stop. Pick tap-to-toggle: it is easier to build and easier to demo one-handed.
3. While recording, show a red pulsing dot and an elapsed timer. Hard stop at 120 seconds.
4. Tapping any SOAP bullet highlights its source segments in the transcript block below and scrolls them into view. Tapping again clears the highlight.
5. While the pipeline runs, show a typing indicator with a stage label: "Transcribing…" then "Writing note…". Two labels make a 6-second wait feel intentional rather than broken.

### 7.2 Key Features

#### Feature A — Ambient Scribe (voice → SOAP note)

**Flow:**
1. User records up to 2 minutes with `expo-audio`.
2. Frontend posts the `.m4a` file as `multipart/form-data` to `POST /api/process-voice`.
3. Backend receives it via `multer` (memory storage), sends it to Groq Whisper (`whisper-large-v3`) with `response_format: "verbose_json"`, which returns a `segments` array where each segment has `id`, `start`, `end`, and `text`.
4. Backend strips each segment down to `{ id, text }` and sends that array to `llama-3.3-70b-versatile` with `response_format: { type: "json_object" }` and the system prompt in Appendix A.
5. Backend validates the returned JSON before responding (see Feature C).
6. Frontend renders the note as a custom chat bubble with tappable bullets.

**Why send only `{id, text}` to the LLM:** timestamps are noise for the note-writing task and burn tokens. Keep the full segments server-side, keyed by `id`, and send them back to the frontend separately for display.

#### Feature B — Lab Report Analyzer (image/PDF → explanation)

**Flow:**
1. User picks a file with `expo-image-picker` (photos) or `expo-document-picker` (PDFs).
2. Frontend posts to `POST /api/process-document`.
3. Backend branches on MIME type:
   - **Image (png/jpeg/webp):** base64-encode, send as an `image_url` content block with a `data:` URI to `meta-llama/llama-4-scout-17b-16e-instruct`.
   - **PDF:** extract text with `pdf-parse`, send the text to `llama-3.3-70b-versatile`.
4. The model returns JSON: a list of parameters with `name`, `value`, `reference_range`, `status` (`normal` / `high` / `low` / `unknown`), and a plain-English `meaning`, plus a `questions_for_doctor` array.
5. Frontend renders a table where abnormal rows are colour-coded, followed by the suggested questions.

**Hard rule in the prompt:** the model must not diagnose, must not recommend treatment, and must not tell the user whether to be worried. It describes what the number measures and what "high" or "low" generally indicates, then hands off to a doctor.

#### Feature C — Response validation (do not skip this)

The single most likely cause of a demo failing live is `JSON.parse` throwing on a malformed response, or the model inventing a `source_segment_ids` value like `[47]` when only 12 segments exist.

Backend must, before responding:
1. Wrap `JSON.parse` in try/catch. On failure, retry the Groq call **once** with the error appended to the user message. On second failure, return a friendly error object.
2. Check the shape: `soap_note` exists, and each of `subjective`/`objective`/`assessment`/`plan` is an array (default to `[]` if missing).
3. Filter every `source_segment_ids` array to IDs that actually exist in the transcript. Drop the rest silently.
4. Never let an unhandled rejection reach the client. Every route wrapped in try/catch.

### 7.3 Technology

**Frontend — React Native (Expo)**

| Package | Purpose |
|---|---|
| `expo` | App shell, dev client, QR-code testing |
| `expo-audio` | Microphone recording (replaces deprecated `expo-av`) |
| `expo-image-picker` | Camera roll + camera access |
| `expo-document-picker` | PDF selection |
| `react-native-gifted-chat` | Chat timeline, bubbles, auto-scroll, avatars |
| `@expo/vector-icons` | Mic, paperclip, send icons (bundled with Expo) |

**Backend — Node.js + Express**

| Package | Purpose |
|---|---|
| `express` | HTTP routes |
| `multer` | Parses `multipart/form-data` uploads |
| `groq-sdk` | Groq API client (Groq's SDK, not Meta's) |
| `pdf-parse` | PDF text extraction |
| `cors` | Allows the Expo app to call the local server |
| `dotenv` | Loads `GROQ_API_KEY` |

**Models on Groq (free tier)**

| Job | Model ID | Notes |
|---|---|---|
| Transcription | `whisper-large-v3` | Use `whisper-large-v3-turbo` if you want speed over accuracy |
| Text → JSON | `llama-3.3-70b-versatile` | Supports `response_format: json_object` |
| Vision / OCR | `meta-llama/llama-4-scout-17b-16e-instruct` | Multimodal; verify ID before building |

**Deliberately excluded:** LangChain, LlamaIndex, vector DBs, any database, any auth provider. There is no retrieval problem here and no state to persist. Adding them would make the code harder to read without making the demo better.

**Known package trap:** `pdf-parse` runs a debug block on import that tries to read a test PDF from disk and crashes. Import the library file directly:

```javascript
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
```

### 7.4 Assumptions (unproven — validate early)

| # | Assumption | Risk if wrong | Validate by |
|---|---|---|---|
| A1 | Groq's free tier rate limits allow a live demo without 429 errors | Demo dies mid-interview | Fire 20 requests in 5 minutes in Milestone 2; read the limits page |
| A2 | Groq's free tier includes the audio/transcription endpoint | Feature A is dead | Test a single Whisper call on day one, before anything else |
| A3 | Llama 3.3 returns valid JSON ≥95% of the time at `temperature: 0.1` | Constant parse errors | Run 20 recordings in Milestone 2 and count |
| A4 | Llama 3.3 assigns *correct* segment IDs, not merely valid ones | The headline feature quietly lies | Manually check 10 notes; this is the assumption most likely to fail |
| A5 | Llama 4 Scout reads a phone photo of a lab report accurately | Feature B produces garbage | Test with 3 real lab report photos at varying angles |
| A6 | `expo-audio` output (`.m4a`) is accepted by Groq Whisper | Feature A blocked at step 1 | Test with one file before building any UI |
| A7 | The Expo Go app can reach a local Express server over the LAN | Nothing works on a real device | Test in Milestone 2 with the machine's LAN IP, not `localhost` |

**A4 deserves special attention.** A model that returns `[1,2]` when the real answer is `[4,5]` produces output that looks perfect and is wrong. If accuracy is poor, the mitigation is to number the segments explicitly in the user message (`[0] text…`, `[1] text…`) rather than passing raw JSON, which measurably improves index-following.

### 7.5 Safety and scope limits

Non-negotiable for anything that touches medical data, even a demo:

1. A persistent disclaimer in the app header or first message: *"Demo only. Not a medical device. Do not use for real clinical decisions."*
2. No storage. Audio buffers stay in memory (`multer.memoryStorage()`), are used once, and are discarded. No database, no filesystem writes, no logging of transcript content.
3. The lab-report prompt explicitly forbids diagnosis and treatment advice.
4. Demo with synthetic or your own data only. Never a real patient's report.
5. `.env` is in `.gitignore` from the first commit. A leaked Groq key on a public GitHub repo is a bad look for a job application.

---

## 8. Release

**Total build time: ~12 hours**, split into six milestones. Each ends in something you can run and see. Do them in order — every one depends on the last.

### Milestone 0 — Prove the pipeline before building the app (45 min)

Do this first. It de-risks assumptions A1, A2, A3 and A6 before you have written any UI that would be wasted.

1. Sign up at <https://console.groq.com>, create an API key.
2. Make a folder `spike/`, run `npm init -y && npm i groq-sdk dotenv`.
3. Record a 30-second voice memo on your phone about a fake medical visit. Move the file to `spike/`.
4. Write one script that: sends the file to Whisper, prints the segments, sends the segments to Llama 3.3, prints the JSON.
5. Run it. Confirm the JSON parses.

**Done when:** you have printed a valid SOAP note JSON in your terminal. If this fails, stop and fix it — nothing downstream works without it.

---

### Milestone 1 — Chat UI shell (2 hours)

Frontend only. No network calls.

1. `npx create-expo-app mediscribe && cd mediscribe`
2. `npx expo install react-native-gifted-chat expo-audio expo-image-picker expo-document-picker`
3. Build one screen with `<GiftedChat />`, seeded with a hardcoded welcome message from the AI.
4. Replace the default input toolbar: paperclip on the left, text field in the middle, mic on the right. The mic swaps to a send arrow when the text field is non-empty.
5. Wire the mic button to `expo-audio`: request permission, start recording, show a red dot and a timer, stop at 120 seconds.
6. On stop, push a placeholder user message showing the duration. Do not upload anything yet.
7. Add the disclaimer to the header.

**Done when:** you can open the app on your phone via Expo Go, tap the mic, watch the timer run, stop, and see an audio message appear in the chat.

---

### Milestone 2 — Voice → SOAP backend (3 hours)

1. New folder `server/`. `npm i express multer groq-sdk cors dotenv`.
2. `.env` with `GROQ_API_KEY`. Add `.env` to `.gitignore` **now**.
3. Build `POST /api/process-voice`:
   - `multer` with `memoryStorage()`, 25 MB limit, single field named `audio`
   - Whisper call with `response_format: "verbose_json"`
   - Map segments to `{ id, text }`
   - Llama 3.3 call with the Appendix A system prompt, `temperature: 0.1`, `response_format: { type: "json_object" }`
   - Return `{ success: true, data: { soap_note, segments } }` — segments included so the frontend can render the transcript
4. Test with `curl -F "audio=@test.m4a" http://localhost:3000/api/process-voice`.
5. Add a `/health` route that returns `{ ok: true }`.
6. From the phone, hit `http://<your-LAN-IP>:3000/health` in a browser. If it fails, you are on a different network or the firewall is blocking — fix this before continuing.

**Done when:** curl returns a valid SOAP note, and your phone can reach `/health`.

---

### Milestone 3 — Connect the app to the backend (1.5 hours)

1. Put the LAN IP in a `config.js` constant so you change it in one place.
2. On recording stop, build `FormData` with the audio file URI and POST it.
3. Show the typing indicator with stage labels while waiting.
4. On response, push a custom AI message carrying the SOAP note object as a payload.
5. Write `<SoapNoteBubble />` — renders four sections with bullets, plus a divider and the raw transcript list below. No interactivity yet, plain text only.
6. Handle errors: on failure, push an AI message saying what went wrong. Never let it fail silently.

**Done when:** you speak into the phone and a formatted SOAP note appears in the chat within ~10 seconds.

---

### Milestone 4 — Linked evidence, the headline feature (1.5 hours)

1. In `<SoapNoteBubble />`, add state: `const [activeIds, setActiveIds] = useState([])`.
2. Wrap each bullet in a `<Pressable>`. On press, `setActiveIds(bullet.source_segment_ids)`. Press the same bullet again to clear.
3. In the transcript list, give a segment a yellow background when `activeIds.includes(segment.id)`.
4. Style the active bullet too — a left border or bold — so it is obvious which one is selected.
5. Use a `ref` on the transcript `ScrollView` to scroll the first highlighted segment into view.
6. **Verify A4 here:** run 10 recordings and read whether the highlighted lines genuinely support the bullet. If they do not, apply the explicit-numbering mitigation from §7.4.

**Done when:** tapping a bullet lights up the right transcript lines. This is the moment the demo becomes worth showing.

---

### Milestone 5 — Lab report analyzer (2 hours)

1. Wire the paperclip: an action sheet with "Take photo" / "Choose image" / "Choose PDF".
2. Build `POST /api/process-document` with `multer`, branching on `req.file.mimetype`.
3. Image path: base64 → Llama 4 Scout vision call with the Appendix B prompt.
4. PDF path: `pdf-parse` (using the direct-file import) → Llama 3.3 with the same prompt.
5. Frontend `<LabReportBubble />`: a table of parameters with abnormal rows tinted, then the "Questions for your doctor" list.
6. Test with three real lab report photos at different angles and lighting.

**Done when:** you photograph a lab report and get back a readable, colour-coded breakdown.

---

### Milestone 6 — Harden and polish (1.5 hours)

1. Add the retry-once-on-parse-failure logic (§7.2 Feature C).
2. Add segment-ID filtering so invalid IDs never reach the UI.
3. Empty-state handling: what shows if Whisper returns silence, or the photo is not a lab report.
4. Run KR1 and KR2: 20 recordings, log latency, count parse failures. Write the numbers down — quoting real measurements in an interview is far stronger than "it works".
5. Write a README: what it is, how to run it, the architecture in five lines, and a GIF of the linked-evidence tap.
6. Confirm `.env` is not in git history: `git log --all -p | grep -i gsk_` should return nothing.

**Done when:** you can hand the phone to a stranger and it survives.

---

### Scope: v1 vs later

| In v1 (build now) | Explicitly out (mention only if asked) |
|---|---|
| Voice → SOAP note | Speaker diarisation (who said what) |
| Tap-to-highlight linked evidence | Real-time streaming transcription |
| Image + PDF lab report analysis | ICD-10 / CPT / SNOMED code mapping |
| Session-only, no storage | Note editing and export |
| Local Express backend | Deployed backend, auth, history |

Note the last row. **Deploy the backend before the interview** if you can — Render or Railway free tier, one env var. A demo that only runs on your laptop's Wi-Fi is a demo that fails in a conference room. This is worth 30 minutes.

---

## Appendix A — SOAP note system prompt

Send with `response_format: { type: "json_object" }` and `temperature: 0.1`.

```text
You are an expert AI Medical Scribe modeled after the Abridge platform's
clinical intelligence engine.

Your task is to analyze an incoming array of numbered transcript segments
from a patient-doctor encounter and synthesize them into a professional,
structured clinical SOAP note.

CRITICAL INSTRUCTIONS:
1. Respond ONLY with a valid JSON object. No conversational filler, no
   markdown code fences, no introductory or concluding text.
2. For EVERY bullet point you generate, you MUST populate
   "source_segment_ids" with the exact "id" numbers of the transcript
   segments that justify that specific clinical claim.
3. Only use id numbers that appear in the input. Never invent an id.
4. If several segments support one bullet, include all of their ids.
5. Clean messy dialogue, stutters, and greetings into standard medical
   terminology.
6. Do not hallucinate. Do not extrapolate beyond what was said. If a SOAP
   section has no supporting content in the transcript, return an empty
   array for it rather than inventing content.

EXPECTED JSON SCHEMA:
{
  "soap_note": {
    "subjective": [
      { "text": "Patient's reported symptoms, history, and concerns.",
        "source_segment_ids": [0, 1] }
    ],
    "objective": [
      { "text": "Exam findings, vitals, or verbalized lab metrics.",
        "source_segment_ids": [4] }
    ],
    "assessment": [
      { "text": "Clinical impressions, differentials, ruled-out conditions.",
        "source_segment_ids": [7] }
    ],
    "plan": [
      { "text": "Next steps, medications, tests, referrals, follow-up.",
        "source_segment_ids": [11] }
    ]
  }
}
```

**Format the user message with explicit numbering** — this improves ID accuracy over passing raw JSON:

```javascript
const numbered = segments
  .map(s => `[${s.id}] ${s.text.trim()}`)
  .join('\n');

const userMessageContent =
  `Transcript segments to analyze:\n\n${numbered}`;
```

---

## Appendix B — Lab report system prompt

```text
You are a medical information assistant that explains laboratory test
results to patients in plain language.

Analyze the lab report provided and respond ONLY with a valid JSON object.

RULES:
1. Never diagnose. Never suggest treatment. Never state whether the patient
   should be worried.
2. Explain what each test measures and what an out-of-range value generally
   indicates, in language a 12-year-old could follow.
3. If a value or reference range is unreadable, set it to null and set
   status to "unknown". Never guess a number.
4. Always end by directing the reader to their doctor.

EXPECTED JSON SCHEMA:
{
  "report_type": "e.g. Complete Blood Count",
  "parameters": [
    {
      "name": "Hemoglobin",
      "value": "11.2 g/dL",
      "reference_range": "13.5 - 17.5 g/dL",
      "status": "low",
      "meaning": "Hemoglobin carries oxygen in your blood. A lower than
                  usual level is often linked to low iron."
    }
  ],
  "abnormal_count": 1,
  "questions_for_doctor": [
    "My hemoglobin is below the reference range — should we check my iron?"
  ],
  "disclaimer": "This is an automated explanation, not medical advice.
                 Discuss these results with your doctor."
}
```

---

## Appendix C — Reference implementation, voice route

```javascript
// server/routes/voice.js
const express = require('express');
const multer = require('multer');
const Groq = require('groq-sdk');
const { SOAP_SYSTEM_PROMPT } = require('../prompts');

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';
const STT_MODEL  = process.env.GROQ_STT_MODEL  || 'whisper-large-v3';

router.post('/process-voice', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file.' });
    }

    // 1. Transcribe with timestamps
    const transcription = await groq.audio.transcriptions.create({
      file: await Groq.toFile(req.file.buffer, req.file.originalname || 'audio.m4a'),
      model: STT_MODEL,
      response_format: 'verbose_json',
    });

    const segments = (transcription.segments || []).map((s, i) => ({
      id: i,
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    if (segments.length === 0) {
      return res.json({
        success: false,
        error: "I couldn't hear anything in that recording. Try again?",
      });
    }

    // 2. Structure into a SOAP note
    const numbered = segments.map(s => `[${s.id}] ${s.text}`).join('\n');
    const soapNote = await callWithRetry(numbered);

    // 3. Drop any segment id the model invented
    const validIds = new Set(segments.map(s => s.id));
    for (const section of Object.values(soapNote.soap_note)) {
      if (!Array.isArray(section)) continue;
      for (const bullet of section) {
        bullet.source_segment_ids =
          (bullet.source_segment_ids || []).filter(id => validIds.has(id));
      }
    }

    res.json({ success: true, data: { ...soapNote, segments } });

  } catch (err) {
    console.error('[process-voice]', err.message);
    res.status(500).json({
      success: false,
      error: 'Something went wrong processing that recording.',
    });
  }
});

// Retry once on malformed JSON, feeding the error back to the model
async function callWithRetry(numbered, attempt = 0) {
  const messages = [
    { role: 'system', content: SOAP_SYSTEM_PROMPT },
    { role: 'user', content: `Transcript segments to analyze:\n\n${numbered}` },
  ];

  if (attempt > 0) {
    messages.push({
      role: 'user',
      content: 'Your last response was not valid JSON. Respond with the ' +
               'JSON object only, matching the schema exactly.',
    });
  }

  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages,
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content);
    // Normalize shape so the frontend never sees undefined
    parsed.soap_note = parsed.soap_note || {};
    for (const key of ['subjective', 'objective', 'assessment', 'plan']) {
      if (!Array.isArray(parsed.soap_note[key])) parsed.soap_note[key] = [];
    }
    return parsed;
  } catch (e) {
    if (attempt === 0) return callWithRetry(numbered, 1);
    throw new Error('Model returned invalid JSON twice.');
  }
}

module.exports = router;
```

---

## Appendix D — Pre-demo checklist

Run through this the morning of the interview.

- [ ] Backend deployed and reachable over the public internet (not just LAN)
- [ ] `GROQ_API_KEY` set in the deployment environment
- [ ] Model IDs re-verified against the Groq models page — they rotate
- [ ] One test recording run end-to-end today, not yesterday
- [ ] Phone charged, brightness up, notifications off
- [ ] A prepared 45-second script of a fake patient visit that you can deliver cleanly
- [ ] One lab report image already saved to the camera roll as a fallback
- [ ] A screen-recorded GIF of the working flow, in case the Wi-Fi fails entirely
- [ ] Repo public, README written, no key in git history
