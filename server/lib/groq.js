const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  // The free tier queues under load: transcription that takes 2s idle has been
  // measured at 40s+ during a burst. Allow room for that, but stay under the
  // app's own 60s timeout so the phone is never left waiting on a request the
  // server has already given up explaining.
  timeout: 45_000,
  maxRetries: 1,
});

const STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3';
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';
const VISION_MODEL =
  process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

/**
 * Calls a Groq chat model that must answer with JSON, and retries exactly once
 * if the response doesn't parse — feeding the failure back to the model.
 *
 * Two attempts, not more: a model that fails twice at temperature 0.1 is not
 * going to succeed on the third try, and a demo cannot wait for it.
 *
 * @param {{ system: string, user: string, model?: string, temperature?: number }} options
 * @returns {Promise<{ parsed: unknown, attempts: number }>}
 */
async function completeJson({ system, user, model = TEXT_MODEL, temperature = 0.1 }) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    if (attempt > 0) {
      messages.push({
        role: 'user',
        content:
          'Your last response was not valid JSON. Respond with the JSON object ' +
          'only, matching the schema exactly. No markdown fences, no commentary.',
      });
    }

    const completion = await groq.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature,
      messages,
    });

    const content = completion.choices?.[0]?.message?.content ?? '';

    try {
      return { parsed: JSON.parse(content), attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Model returned invalid JSON twice: ${lastError?.message}`);
}

/**
 * Same contract as {@link completeJson}, but the user turn carries an image.
 *
 * The image is inlined as a `data:` URI rather than uploaded anywhere — the
 * photo exists only for the length of this request (PRD §7.5).
 *
 * @param {{ system: string, text: string, imageBase64: string, mimeType: string, model?: string }} options
 * @returns {Promise<{ parsed: unknown, attempts: number }>}
 */
async function completeJsonWithImage({
  system,
  text,
  imageBase64,
  mimeType,
  model = VISION_MODEL,
}) {
  let lastError = null;
  // Reasoning tokens compete with the answer. Left on, the model reads the top
  // of a lab table, spends its budget thinking, and silently drops the last
  // rows — measured on the same report, 3-6 of 7 parameters and zero suggested
  // questions with reasoning on, a clean 7 of 7 with it off.
  let useReasoningEffort = true;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = [
      {
        type: 'text',
        text:
          attempt === 0
            ? text
            : `${text}\n\nYour last response was not valid JSON. Respond with the JSON object only, matching the schema exactly.`,
      },
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
    ];

    try {
      const completion = await groq.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_completion_tokens: 4096,
        ...(useReasoningEffort ? { reasoning_effort: 'none' } : null),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content },
        ],
      });

      return {
        parsed: JSON.parse(completion.choices?.[0]?.message?.content ?? ''),
        attempts: attempt + 1,
      };
    } catch (error) {
      // Not every model accepts reasoning_effort, and the configured one can
      // change in .env at any time. Drop the parameter and retry rather than
      // failing the request over it.
      if (useReasoningEffort && /reasoning_effort/i.test(String(error?.message))) {
        useReasoningEffort = false;
        attempt -= 1;
        continue;
      }
      // API-level failures (rate limit, auth, bad image) are the route's to
      // explain; only malformed JSON is worth retrying here.
      if (error?.status) throw error;
      lastError = error;
    }
  }

  throw new Error(`Vision model returned invalid JSON twice: ${lastError?.message}`);
}

/**
 * Transcribes an audio buffer with timestamps.
 *
 * Returns segments already renumbered from 0. Whisper's own segment ids are
 * usually sequential but not contractually so, and every downstream feature
 * keys off these numbers.
 *
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<{ id: number, start: number, end: number, text: string }[]>}
 */
async function transcribe(buffer, filename) {
  const transcription = await groq.audio.transcriptions.create({
    file: await Groq.toFile(buffer, filename || 'audio.m4a'),
    model: STT_MODEL,
    response_format: 'verbose_json',
  });

  return (transcription.segments || [])
    .map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: String(segment.text || '').trim(),
    }))
    .filter((segment) => segment.text.length > 0)
    .map((segment, index) => ({ id: index, ...segment }));
}

module.exports = {
  groq,
  transcribe,
  completeJson,
  completeJsonWithImage,
  STT_MODEL,
  TEXT_MODEL,
  VISION_MODEL,
};
