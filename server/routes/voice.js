const express = require('express');
const multer = require('multer');

const { describeGroqError } = require('../lib/errors');
const { transcribe, completeJson } = require('../lib/groq');
const { normalizeSoapNote, filterSegmentIds, isEmptyNote, normalizePatientDocuments } = require('../lib/soap');
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
    const documents = normalizePatientDocuments(parsed, note, segments);

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
        `${documents.patient_summary.length} summary, ${documents.checklist.length} tasks, ` +
        `stt ${transcribedAt - startedAt}ms, llm ${completedAt - transcribedAt}ms, ` +
        `total ${completedAt - startedAt}ms`
    );

    return res.json({
      success: true,
      data: {
        soap_note: note.soap_note,
        patient_summary: documents.patient_summary,
        checklist: documents.checklist,
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

module.exports = router;
