const SYMPTOM_CAP = 6;
const MEDICINE_CAP = 8;
const ALLERGY_CAP = 6;
const QUESTION_CAP = 6;

const PREP_STOPWORDS = new Set([
  'about', 'would', 'could', 'should', 'something', 'someone', 'there', 'their',
  'which', 'where', 'while', 'because', 'going', 'being',
]);

function digitTokens(text) {
  return String(text).match(/\d+(?:\.\d+)?/g) || [];
}

/** Words of 4 or more letters. Shorter words are too common to prove a citation. */
function contentWords(text) {
  return (String(text).toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []).filter(
    (word) => !PREP_STOPWORDS.has(word)
  );
}

function coerceIdList(raw, validIds) {
  if (!Array.isArray(raw)) return [];
  const filtered = [];
  for (const rawId of raw) {
    const id = typeof rawId === 'string' ? Number(rawId) : rawId;
    if (Number.isInteger(id) && validIds.has(id) && !filtered.includes(id)) filtered.push(id);
  }
  return filtered;
}

function citedText(ids, segmentsById) {
  return ids.map((id) => segmentsById.get(id)?.text || '').join(' ');
}

/**
 * A medicine line may only contain words and doses that were spoken.
 * "carvedilol" cited against "the heart pill" is dropped.
 */
function medicineFaithful(itemText, segmentText) {
  const segment = segmentText.toLowerCase();
  for (const word of contentWords(itemText)) {
    if (!segment.includes(word)) return false;
  }
  return digitTokens(itemText).every((digit) => segmentText.includes(digit));
}

/** Symptoms, reason, and questions may be lightly reworded, but not invented. */
function sharesContent(itemText, segmentText) {
  const words = contentWords(itemText);
  if (words.length === 0) return false;
  const segment = segmentText.toLowerCase();
  const shared = words.filter((word) => segment.includes(word));
  return shared.length >= Math.min(2, words.length);
}

function takeLines(rawList, validIds, segmentsById, cap, faithful) {
  if (!Array.isArray(rawList)) return [];
  const lines = [];
  for (const raw of rawList) {
    if (!raw || typeof raw !== 'object' || typeof raw.text !== 'string') continue;
    const text = raw.text.trim();
    const ids = coerceIdList(raw.source_segment_ids, validIds);
    if (!text || ids.length === 0) continue;
    if (!faithful(text, citedText(ids, segmentsById))) continue;
    lines.push({ text, source_segment_ids: ids });
    if (lines.length >= cap) break;
  }
  return lines;
}

/**
 * @param {unknown} parsed
 * @param {{ id: number, text: string }[]} segments
 * @returns {{ reason: {text: string, source_segment_ids: number[]} | null, symptoms: object[], medicines: object[], allergies: object[], questions: object[] }}
 */
function normalizePrep(parsed, segments) {
  const validIds = new Set(segments.map((segment) => segment.id));
  const segmentsById = new Map(segments.map((segment) => [segment.id, segment]));
  const brief = parsed && typeof parsed === 'object' && parsed.brief && typeof parsed.brief === 'object'
    ? parsed.brief
    : {};

  const reasonLines = takeLines(
    brief.reason ? [brief.reason] : [],
    validIds,
    segmentsById,
    1,
    sharesContent
  );

  return {
    reason: reasonLines[0] || null,
    symptoms: takeLines(brief.symptoms, validIds, segmentsById, SYMPTOM_CAP, sharesContent),
    medicines: takeLines(brief.medicines, validIds, segmentsById, MEDICINE_CAP, medicineFaithful),
    allergies: takeLines(brief.allergies, validIds, segmentsById, ALLERGY_CAP, medicineFaithful),
    questions: takeLines(brief.questions, validIds, segmentsById, QUESTION_CAP, sharesContent),
  };
}

function isEmptyBrief(brief) {
  return (
    !brief.reason &&
    brief.symptoms.length === 0 &&
    brief.medicines.length === 0 &&
    brief.allergies.length === 0 &&
    brief.questions.length === 0
  );
}

module.exports = { normalizePrep, isEmptyBrief };
