# MediScribe AI Chat

A single-screen mobile app that turns a spoken doctor–patient conversation into
a structured clinical SOAP note, and a photo of a lab report into a plain-English
explanation.

**Every line of the generated note is tappable and highlights the exact words in
the raw transcript that produced it.** That is the point of the project.
Transcription is a solved problem; a note a clinician can audit is not.

> Demo only. Not a medical device. Do not use for real clinical decisions.
> No login, no database, nothing stored past the session.

## Architecture in five lines

1. The app records up to two minutes with `expo-audio` and POSTs the `.m4a` to a local Express server.
2. The server sends it to Groq Whisper with `verbose_json`, getting back timestamped segments.
3. It strips those to `{ id, text }`, numbers them explicitly, and asks a text model for a SOAP note in JSON — each bullet citing the segment ids that justify it.
4. It validates the JSON, drops any segment id the model invented, and returns the note *plus* the transcript.
5. The app renders both; tapping a bullet highlights its sources and scrolls them into view.

The lab report path is the same shape: image to a vision model, PDF to the text
model, both returning a validated table of parameters plus questions to ask a
doctor.

Deliberately excluded: LangChain, vector databases, any database, any auth.
There is no retrieval problem here and no state to persist.

## Running it

Two terminals. The server first.

```bash
cd server && cp .env.example .env && npm install && npm start
```

Paste a free key from [console.groq.com](https://console.groq.com) into `.env`.
The server prints the LAN address to use from a phone.

```bash
cd mediscribe && npm install && npx expo start
```

The app finds the server automatically by reusing whichever host is serving the
Expo bundle. To point at a fixed or deployed backend, set
`API_BASE_URL_OVERRIDE` in `mediscribe/src/config.ts`.

There is a script to read aloud in [`server/samples/demo-script.md`](server/samples/demo-script.md),
and synthetic fixtures next to it so the pipeline can be exercised without a
microphone or camera.

## Measured, not asserted

Twenty runs across five different synthetic consultations (66–78s each), against
the real Groq API:

| | Target | Result |
|---|---|---|
| **KR2** JSON parse success | 19 of 20 | **19 of 20**, zero retries needed |
| **A3** valid JSON first attempt | ≥95% | **100%** of calls that completed |
| **A4** every bullet cites a real segment | all | **0 invalid ids**, 0 of 146 bullets without evidence |
| **KR1** end-to-end under 10s | 60s recording | **met when paced, not under burst** — see below |
| **KR4** cost | $0.00 | $0.00, free tier, no card |

**KR1 needs the caveat.** Requested one at a time, the way a demo actually runs:
6 of 6 under ten seconds, median 8.2s. Fired back-to-back twenty times, the free
tier queues hard — median 10.8s, 90th percentile 46s, and one request timed out
outright. Transcription is the bottleneck under load (median 8.7s queued versus
2.9s idle), not the note-writing. `whisper-large-v3-turbo` does not fix it:
benchmarked at 3.3s versus 3.9s median, which is queueing, not model speed.

Practical consequence: do not stress-test the API right before showing someone.

The one failure in twenty was a client timeout, not malformed output. It now
returns "the transcription service is busy, try that recording again" rather
than a generic error.

## Things worth knowing before you extend this

**Groq rotates models without notice.** Every model id lives in `server/.env`,
never in code. `llama-3.3-70b-versatile` and
`meta-llama/llama-4-scout-17b-16e-instruct` — both named in the PRD — no longer
exist on the API. Current config uses `openai/gpt-oss-120b` for text and
`qwen/qwen3.6-27b` for vision. Nothing in Groq's list is advertised as
multimodal; qwen was found by testing rather than by reading the naming.

**Three non-obvious failures are documented in [`server/README.md`](server/README.md):**
the segment ids that must be quoted strings or the model silently concatenates
them; the vision model that drops half a table unless reasoning is switched off;
and the React Native file-upload idiom that Expo's `fetch` rejects outright.
Each one looked like something else entirely.

## Safety

No login, no database, no filesystem writes on the server — audio lives in
memory for one request and is discarded. Recordings are deleted from the app's
cache once the server has answered. Server logs carry counts and timings only,
never transcript or lab content. The lab-report prompt is forbidden from
diagnosing, recommending treatment, or telling the reader whether to worry; it
explains what a test measures and hands off to a doctor.

Demo with synthetic data only. Everything in `server/samples/` is generated.

## Known gaps

- The linked-evidence auto-scroll is written but unverified on a device.
- Lab reports have been tested against generated fixtures, not photographs of
  real printouts at varying angles and lighting (assumption A5).
- No README GIF of the linked-evidence tap yet.
- Backend runs locally. Deploy it before demoing anywhere you do not control the
  Wi-Fi.
# mediscribe-chat
