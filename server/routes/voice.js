const express = require('express');
const multer = require('multer');

const { transcribe, completeJson } = require('../lib/groq');
const { normalizeSoapNote, filterSegmentIds, isEmptyNote } = require('../lib/soap');
const { SOAP_SYSTEM_PROMPT } = require('../prompts');

const router = express.Router();

// Memory storage only. Audio is used once and discarded — nothing touches disk
// and nothing is logged (PRD §7.5).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/**
 * Numbering the segments explicitly in the user message measurably improves
 * the model's id accuracy over handing it raw JSON (PRD §7.4, assumption A4).
 */
function buildUserMessage(segments) {
  const numbered = segments.map((segment) => `[${segment.id}] ${segment.text}`).join('\n');
  return `Transcript segments to analyze:\n\n${numbered}`;
}

router.post('/process-voice', upload.single('audio'), async (req, res) => {
  const startedAt = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file uploaded.' });
    }

    const segments = await transcribe(req.file.buffer, req.file.originalname);
    const transcribedAt = Date.now();

    if (segments.length === 0) {
      return res.json({
        success: false,
        error: "I couldn't hear anything in that recording. Try again?",
      });
    }

    const { parsed, attempts } = await completeJson({
      system: SOAP_SYSTEM_PROMPT,
      user: buildUserMessage(segments),
    });

    const note = normalizeSoapNote(parsed);
    const { kept, dropped } = filterSegmentIds(note, segments);

    if (isEmptyNote(note)) {
      // The audio and transcription both worked — there was simply no clinical
      // content to structure. Quoting what was heard is the difference between
      // "the app is broken" and "say something a doctor would say".
      const heard = segments.map((segment) => segment.text).join(' ');
      const preview = heard.length > 140 ? `${heard.slice(0, 140)}…` : heard;

      return res.json({
        success: false,
        error:
          `I heard: “${preview}”\n\n` +
          'That has no clinical content to turn into a note. Try describing ' +
          'symptoms, exam findings, and a plan.',
      });
    }

    const completedAt = Date.now();

    // Timings and counts only — never transcript content (PRD §7.5).
    console.log(
      `[process-voice] ${segments.length} segments, ${attempts} LLM attempt(s), ` +
        `${kept} ids kept / ${dropped} dropped, ` +
        `stt ${transcribedAt - startedAt}ms, llm ${completedAt - transcribedAt}ms, ` +
        `total ${completedAt - startedAt}ms`
    );

    return res.json({
      success: true,
      data: {
        soap_note: note.soap_note,
        segments,
        meta: {
          llm_attempts: attempts,
          invalid_segment_ids_dropped: dropped,
          latency_ms: {
            transcription: transcribedAt - startedAt,
            note: completedAt - transcribedAt,
            total: completedAt - startedAt,
          },
        },
      },
    });
  } catch (error) {
    console.error('[process-voice]', error.status || '', error.message);

    const friendly = describeGroqError(error);
    if (friendly) return res.json({ success: false, error: friendly });

    return res.status(500).json({
      success: false,
      error: 'Something went wrong processing that recording.',
    });
  }
});

/**
 * Turns the Groq failures a user can actually cause into something worth
 * reading. Anything else falls through to the generic 500 — a stack trace is
 * not a demo.
 *
 * @returns {string | null} A user-facing message, or null if unrecognised.
 */
function describeGroqError(error) {
  const status = error?.status;
  const message = String(error?.message || '');

  if (status === 429) {
    return 'The transcription service is rate limited right now. Wait a moment and try again.';
  }
  // Measured once in twenty back-to-back runs: the free tier queues the audio
  // request past the client timeout. Nothing the user did wrong, and trying
  // again a moment later works.
  if (/timed out|timeout/i.test(message)) {
    return 'The transcription service is busy and took too long. Try that recording again.';
  }
  if (status === 413 || /too large/i.test(message)) {
    return 'That recording is too long to process. Try a shorter one.';
  }
  if (/too short/i.test(message)) {
    return 'That recording was too short to hear. Hold the mic a little longer.';
  }
  if (status === 401 || status === 403) {
    return 'The server could not authenticate with the transcription service.';
  }
  if (/model_not_found/i.test(message) || /does not exist/i.test(message)) {
    return 'The configured AI model is unavailable. Check GROQ_TEXT_MODEL in the server .env.';
  }
  return null;
}

module.exports = router;
