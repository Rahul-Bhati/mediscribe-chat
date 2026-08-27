const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');

const { completeJson, completeJsonWithImage } = require('../lib/groq');
const { normalizeLabReport } = require('../lib/labReport');
const { LAB_REPORT_SYSTEM_PROMPT } = require('../prompts');

const router = express.Router();

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const PDF_TYPE = 'application/pdf';

// Same policy as the voice route: memory only, used once, never written down.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

/**
 * Pulls the text out of a PDF.
 *
 * The PRD warns to import `pdf-parse/lib/pdf-parse.js` directly to dodge a
 * debug block that reads a test file on import. That trap belongs to v1 — v2
 * declares `exports` and that subpath no longer resolves at all. The class API
 * below is the v2 equivalent.
 */
async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    return (result.text || '').trim();
  } finally {
    await parser.destroy();
  }
}

router.post('/process-document', upload.single('document'), async (req, res) => {
  const startedAt = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No document uploaded.' });
    }

    const mimeType = (req.file.mimetype || '').toLowerCase();
    let parsed;
    let attempts;
    let route;

    if (IMAGE_TYPES.includes(mimeType)) {
      route = 'image';
      ({ parsed, attempts } = await completeJsonWithImage({
        system: LAB_REPORT_SYSTEM_PROMPT,
        text: 'Explain every laboratory value visible in this report.',
        imageBase64: req.file.buffer.toString('base64'),
        mimeType,
      }));
    } else if (mimeType === PDF_TYPE) {
      route = 'pdf';
      const text = await extractPdfText(req.file.buffer);

      if (text.length < 20) {
        return res.json({
          success: false,
          error:
            'That PDF has no readable text in it — it may be a scan. Try photographing the page instead.',
        });
      }

      ({ parsed, attempts } = await completeJson({
        system: LAB_REPORT_SYSTEM_PROMPT,
        user: `Explain every laboratory value in this report:\n\n${text}`,
      }));
    } else {
      return res.status(400).json({
        success: false,
        error: 'Upload a photo (PNG, JPEG, WebP) or a PDF of the lab report.',
      });
    }

    const report = normalizeLabReport(parsed);

    if (report.parameters.length === 0) {
      return res.json({
        success: false,
        error:
          "I couldn't find any lab values in that. Make sure the whole report is in frame and the text is readable.",
      });
    }

    const elapsed = Date.now() - startedAt;

    // Counts and timings only — never the values themselves (PRD §7.5).
    console.log(
      `[process-document] ${route}, ${report.parameters.length} parameters, ` +
        `${report.abnormal_count} abnormal, ${attempts} attempt(s), ${elapsed}ms`
    );

    return res.json({
      success: true,
      data: { ...report, meta: { route, attempts, latency_ms: elapsed } },
    });
  } catch (error) {
    console.error('[process-document]', error.status || '', error.message);

    const friendly = describeDocumentError(error);
    if (friendly) return res.json({ success: false, error: friendly });

    return res.status(500).json({
      success: false,
      error: 'Something went wrong reading that document.',
    });
  }
});

/** Turns the failures a user can actually cause into something worth reading. */
function describeDocumentError(error) {
  const status = error?.status;
  const message = String(error?.message || '');

  if (status === 429) {
    return 'The service is rate limited right now. Wait a moment and try again.';
  }
  if (status === 413 || /too large/i.test(message)) {
    return 'That file is too large. Try a smaller photo.';
  }
  if (status === 401 || status === 403) {
    return 'The server could not authenticate with the AI service.';
  }
  if (/model_not_found/i.test(message) || /does not exist/i.test(message)) {
    return 'The configured vision model is unavailable. Check GROQ_VISION_MODEL in the server .env.';
  }
  if (/at least 2 pixels|image/i.test(message) && status === 400) {
    return "That image could not be read. Try a clearer photo of the whole report.";
  }
  if (/password|encrypted/i.test(message)) {
    return 'That PDF is password protected, so I cannot open it.';
  }
  if (/invalid pdf|structure/i.test(message)) {
    return 'That PDF could not be opened. It may be damaged.';
  }
  return null;
}

module.exports = router;
