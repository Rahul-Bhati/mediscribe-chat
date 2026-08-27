const STATUSES = ['normal', 'high', 'low', 'unknown'];

/** Trims to a string, or null when there is nothing usable. Never guesses. */
function readText(value) {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== 'null' ? trimmed : null;
}

/**
 * Coerces the model's response into the exact shape the frontend expects.
 *
 * Nothing here throws. A parameter missing its value renders as "unknown"
 * rather than breaking the table, which matters more here than in the SOAP
 * note: this output is read by an anxious patient, and a blank row is far
 * better than a crash or an invented number.
 *
 * @param {unknown} parsed Result of JSON.parse on the model's response.
 */
function normalizeLabReport(parsed) {
  const source = parsed && typeof parsed === 'object' ? parsed : {};

  const parameters = (Array.isArray(source.parameters) ? source.parameters : [])
    .map((row) => {
      if (!row || typeof row !== 'object') return null;

      const name = readText(row.name);
      if (!name) return null;

      const rawStatus = typeof row.status === 'string' ? row.status.toLowerCase().trim() : '';
      const value = readText(row.value);

      return {
        name,
        value,
        reference_range: readText(row.reference_range),
        // An unreadable value cannot have a meaningful status, whatever the
        // model claimed.
        status: value && STATUSES.includes(rawStatus) ? rawStatus : 'unknown',
        meaning: readText(row.meaning) ?? '',
      };
    })
    .filter(Boolean);

  const questions = (
    Array.isArray(source.questions_for_doctor) ? source.questions_for_doctor : []
  )
    .map(readText)
    .filter(Boolean);

  return {
    report_type: readText(source.report_type) ?? 'Lab report',
    parameters,
    // Recounted rather than trusted — the model's own tally is often stale
    // after normalisation dropped a row.
    abnormal_count: parameters.filter((row) => row.status === 'high' || row.status === 'low')
      .length,
    questions_for_doctor: questions,
    disclaimer:
      readText(source.disclaimer) ??
      'This is an automated explanation, not medical advice. Discuss these results with your doctor.',
  };
}

module.exports = { STATUSES, normalizeLabReport };
