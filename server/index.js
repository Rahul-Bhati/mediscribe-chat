require('dotenv').config();

const os = require('os');
const cors = require('cors');
const express = require('express');
const multer = require('multer');

if (!process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const voiceRoutes = require('./routes/voice');
const documentRoutes = require('./routes/document');
const { STT_MODEL, TEXT_MODEL, VISION_MODEL } = require('./lib/groq');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// The Expo app calls this from a phone on the LAN, so origins vary.
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// The synthetic test recording, so the pipeline can be exercised from a
// browser or another machine without a microphone. Nothing here is real
// patient data — see samples/README in the repo README.
app.use('/samples', express.static(`${__dirname}/samples`));

app.get('/health', (req, res) => {
  res.json({ ok: true, models: { stt: STT_MODEL, text: TEXT_MODEL, vision: VISION_MODEL } });
});

app.use('/api', voiceRoutes);
app.use('/api', documentRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: `No route for ${req.method} ${req.path}` });
});

// Nothing unhandled reaches the client (PRD §7.2, Feature C).
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'That recording is too large. Keep it under 25 MB.'
        : 'That upload could not be read.';
    return res.status(400).json({ success: false, error: message });
  }

  console.error('[unhandled]', error.message);
  return res.status(500).json({ success: false, error: 'Something went wrong.' });
});

/** The address to put in the app's config — `localhost` is useless from a phone. */
function lanAddress() {
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const details of interfaces || []) {
      if (details.family === 'IPv4' && !details.internal) return details.address;
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MediScribe server listening on http://localhost:${PORT}`);
  console.log(`From your phone, use  http://${lanAddress()}:${PORT}`);
});
