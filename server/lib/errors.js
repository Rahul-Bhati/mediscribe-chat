/**
 * Groq failures a user can actually cause, in words worth reading.
 * Anything else returns null and the route answers 500.
 *
 * @returns {string | null}
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

module.exports = { describeGroqError };
