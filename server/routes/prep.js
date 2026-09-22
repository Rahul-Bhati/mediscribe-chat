const express = require('express');
const multer = require('multer');

const { describeGroqError } = require('../lib/errors');
const { transcribe, completeJson } = require('../lib/groq');
const { isEmptyBrief, normalizePrep } = require('../lib/prep');
const { PREP_SYSTEM_PROMPT } = require('../prompts');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function buildUserMessage(segments) {
  const numbered = segments.map((segment) => `[${segment.id}] ${segment.text}`).join('\n');
  return `Transcript segments to analyze:\n\n${numbered}`;
}

router.post('/process-prep', upload.single('audio'), async (req, res) => {
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
      system: PREP_SYSTEM_PROMPT,
      user: buildUserMessage(segments),
    });

    const brief = normalizePrep(parsed, segments);
    const completedAt = Date.now();

    console.log(
      `[process-prep] ${segments.length} segments, ${attempts} LLM attempt(s), ` +
        `reason ${brief.reason ? 1 : 0}, symptoms ${brief.symptoms.length}, ` +
        `medicines ${brief.medicines.length}, questions ${brief.questions.length}, ` +
        `stt ${transcribedAt - startedAt}ms, llm ${completedAt - transcribedAt}ms, ` +
        `total ${completedAt - startedAt}ms`
    );

    if (isEmptyBrief(brief)) {
      const heard = segments.map((segment) => segment.text).join(' ');
      const preview = heard.length > 140 ? `${heard.slice(0, 140)}…` : heard;
      return res.json({
        success: false,
        error:
          `I heard: “${preview}”\n\n` +
          "I couldn't pull a visit brief from that. Try saying why you're coming in, " +
          'any symptoms, and the medicines you take.',
      });
    }

    return res.json({
      success: true,
      data: { brief, segments },
    });
  } catch (error) {
    console.error('[process-prep]', error.status || '', error.message);

    const friendly = describeGroqError(error);
    if (friendly) return res.json({ success: false, error: friendly });

    return res.status(500).json({
      success: false,
      error: 'Something went wrong processing that recording.',
    });
  }
});

module.exports = router;
