const SECTIONS = ['subjective', 'objective', 'assessment', 'plan'];

/**
 * Coerces whatever the model returned into the exact shape the frontend
 * expects. The single most likely cause of a demo failing live is the UI
 * hitting an undefined it never checked for, so nothing here throws — missing
 * or wrong-typed pieces become empty arrays.
 *
 * @param {unknown} parsed  Result of JSON.parse on the model's response.
 * @returns {{ soap_note: Record<string, {text: string, source_segment_ids: number[]}[]> }}
 */
function normalizeSoapNote(parsed) {
  const note = parsed && typeof parsed === 'object' ? parsed.soap_note : null;
  const soap_note = {};

  for (const section of SECTIONS) {
    const bullets = note && Array.isArray(note[section]) ? note[section] : [];

    soap_note[section] = bullets
      .map((bullet) => {
        // Tolerate a bare string where a bullet object was expected.
        if (typeof bullet === 'string') {
          return { text: bullet.trim(), source_segment_ids: [] };
        }
        if (!bullet || typeof bullet !== 'object') return null;

        const text = typeof bullet.text === 'string' ? bullet.text.trim() : '';
        if (!text) return null;

        return {
          text,
          source_segment_ids: Array.isArray(bullet.source_segment_ids)
            ? bullet.source_segment_ids
            : [],
        };
      })
      .filter(Boolean);
  }

  return { soap_note };
}

/**
 * Drops any segment id the model invented. A bullet citing `[47]` when only 12
 * segments exist would light up nothing in the UI and quietly undermine the
 * one feature the demo exists to show, so invalid ids are removed here rather
 * than defended against in the frontend.
 *
 * Mutates `note` in place and reports what it dropped, so a run of test
 * recordings can measure assumption A4 instead of guessing at it.
 *
 * @param {{ soap_note: Record<string, {source_segment_ids: number[]}[]> }} note
 * @param {{ id: number }[]} segments
 * @returns {{ kept: number, dropped: number }}
 */
function filterSegmentIds(note, segments) {
  const validIds = new Set(segments.map((segment) => segment.id));
  let kept = 0;
  let dropped = 0;

  for (const bullets of Object.values(note.soap_note)) {
    for (const bullet of bullets) {
      const filtered = [];

      for (const rawId of bullet.source_segment_ids) {
        // Models sometimes emit "3" rather than 3.
        const id = typeof rawId === 'string' ? Number(rawId) : rawId;

        if (Number.isInteger(id) && validIds.has(id) && !filtered.includes(id)) {
          filtered.push(id);
          kept += 1;
        } else {
          dropped += 1;
        }
      }

      bullet.source_segment_ids = filtered;
    }
  }

  return { kept, dropped };
}

/** True when the model produced no usable content in any section. */
function isEmptyNote(note) {
  return SECTIONS.every((section) => note.soap_note[section].length === 0);
}

const SUMMARY_CAP = 6;
const CHECKLIST_CAP = 8;
const WARNING_CAP = 4;
const CHECKLIST_KINDS = new Set(['medicine', 'test', 'follow_up']);

const TASK_STOPWORDS = new Set([
  'said', 'keep', 'taking', 'come', 'back', 'your', 'with', 'from', 'that', 'this',
  'have', 'been', 'doctor', 'start', 'stop', 'before', 'after', 'repeat', 'about',
  'week', 'weeks', 'twice', 'once', 'daily', 'day', 'days', 'the', 'and', 'for',
  'you', 'want', 'going', 'take', 'come',
]);

const FREQUENCY_PHRASES = ['three times', 'two times', 'once a day', 'twice', 'daily'];
const SCHEDULE_PHRASES = ['this week', 'next week', 'tomorrow', 'two weeks'];

function contentTokens(text) {
  return (String(text).toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []).filter(
    (word) => !TASK_STOPWORDS.has(word)
  );
}

function digitTokens(text) {
  return String(text).match(/\d+(?:\.\d+)?/g) || [];
}

function splitClauses(text) {
  const parts = String(text)
    .split(/\band\b|[,;]/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [String(text)];
}

function phrasesIn(text, phrases) {
  const lower = String(text).toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase));
}

function scheduleIn(text) {
  const found = phrasesIn(text, SCHEDULE_PHRASES);
  const lower = String(text).toLowerCase();
  const re = /\b\d+\s+(?:weeks?|days?)\b/gi;
  let match;
  while ((match = re.exec(lower))) found.push(match[0]);
  return found;
}

function citedText(ids, segmentsById) {
  return ids.map((id) => segmentsById.get(id)?.text || '').join(' ');
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

function stripDoctorPrefix(text) {
  return text.replace(/^the doctor said:?\s*/i, '').trim();
}

/**
 * A medicine line that drops the dose or the frequency in its own clause is
 * worse than no line. Extra numbers elsewhere in the segment (a second drug)
 * do not have to be copied onto this line.
 */
function medicineComplete(itemText, segmentText) {
  const itemDigits = digitTokens(itemText);
  const segmentDigits = digitTokens(segmentText);
  if (segmentDigits.length > 0 && itemDigits.length === 0) return false;
  if (itemDigits.some((digit) => !segmentText.includes(digit))) return false;

  const itemLower = itemText.toLowerCase();
  const clauses = itemDigits.length > 0 ? splitClauses(segmentText) : [];
  for (const dose of itemDigits) {
    const clause = clauses.find((part) => part.includes(dose)) || segmentText;
    for (const phrase of phrasesIn(clause, FREQUENCY_PHRASES)) {
      if (!itemLower.includes(phrase)) return false;
    }
  }
  return true;
}

function followUpComplete(itemText, segmentText) {
  const segmentPhrases = scheduleIn(segmentText);
  const itemLower = itemText.toLowerCase();
  if (segmentPhrases.length > 0 && !segmentPhrases.some((phrase) => itemLower.includes(phrase))) {
    return false;
  }
  return scheduleIn(itemText).every((phrase) => segmentText.toLowerCase().includes(phrase));
}

function testComplete(itemText, segmentText) {
  const tokens = contentTokens(itemText);
  const related = splitClauses(segmentText).filter((clause) =>
    tokens.some((token) => clause.toLowerCase().includes(token))
  );
  const scope = (related.length > 0 ? related.join(' ') : segmentText).toLowerCase();
  return !scope.includes('before') || itemText.toLowerCase().includes('before');
}

function checklistIdentity(item, segmentText) {
  const segment = segmentText.toLowerCase();
  // Only words that were actually spoken. "continue carvedilol" and
  // "keep carvedilol" are the same drug when the transcript said carvedilol.
  const tokens = contentTokens(item.text)
    .filter((token) => segment.includes(token))
    .sort()
    .join('|');
  if (item.kind === 'follow_up') {
    return `${item.kind}:${item.plan_bullet_index}:${scheduleIn(item.text).sort().join('|')}:${tokens}`;
  }
  return `${item.kind}:${item.plan_bullet_index}:${tokens}`;
}

/**
 * A warning may only repeat words that were spoken. "emergency room" cited
 * against "come back if the pain starts at rest" is dropped.
 */
function warningFaithful(itemText, segmentText) {
  const words = contentTokens(itemText);
  if (words.length === 0) return false;
  const segment = segmentText.toLowerCase();
  if (!words.every((word) => segment.includes(word))) return false;
  return digitTokens(itemText).every((digit) => segmentText.includes(digit));
}

function summaryRestatesWarning(text, warnings) {
  const lower = text.toLowerCase();
  const summaryTokens = new Set(contentTokens(text));
  for (const warning of warnings) {
    if (lower.includes(warning.text.toLowerCase())) return true;
    const shared = contentTokens(warning.text).filter((token) => summaryTokens.has(token));
    if (shared.length >= 3) return true;
  }
  return false;
}

function summaryLeaksTask(text, checklist) {
  if (/\byou should\b|\byou have\b/i.test(text)) return true;
  const lower = text.toLowerCase();
  for (const item of checklist) {
    if (item.kind === 'follow_up') {
      for (const phrase of scheduleIn(item.text)) {
        if (lower.includes(phrase)) return true;
      }
    }
    for (const token of contentTokens(item.text)) {
      if (lower.includes(token)) return true;
    }
  }
  return false;
}

/**
 * Patient summary and checklist that ride along with a SOAP note.
 *
 * The note is already normalized and its segment ids already filtered. A bad
 * extra field becomes an empty array. It never throws and never removes SOAP
 * bullets.
 *
 * @param {unknown} parsed
 * @param {{ soap_note: Record<string, {text: string, source_segment_ids: number[]}[]> }} note
 * @param {{ id: number, text: string }[]} segments
 */
function normalizePatientDocuments(parsed, note, segments) {
  const source = parsed && typeof parsed === 'object' ? parsed : {};
  const validIds = new Set(segments.map((segment) => segment.id));
  const segmentsById = new Map(segments.map((segment) => [segment.id, segment]));
  const plan = note?.soap_note?.plan || [];

  const summary = [];
  const rawSummary = Array.isArray(source.patient_summary) ? source.patient_summary : [];
  for (const raw of rawSummary) {
    if (!raw || typeof raw !== 'object' || typeof raw.text !== 'string') continue;
    const text = raw.text.trim();
    const ids = coerceIdList(raw.source_segment_ids, validIds);
    if (!text || ids.length === 0) continue;
    summary.push({ text, source_segment_ids: ids });
  }

  const checklist = [];
  const seen = new Set();
  const rawChecklist = Array.isArray(source.checklist) ? source.checklist : [];
  for (const raw of rawChecklist) {
    if (!raw || typeof raw !== 'object' || typeof raw.text !== 'string') continue;
    if (!CHECKLIST_KINDS.has(raw.kind)) continue;

    const text = stripDoctorPrefix(raw.text);
    if (!text) continue;

    const index = typeof raw.plan_bullet_index === 'string'
      ? Number(raw.plan_bullet_index)
      : raw.plan_bullet_index;
    if (!Number.isInteger(index) || index < 0 || index >= plan.length) continue;

    const ids = coerceIdList(raw.source_segment_ids, validIds);
    if (ids.length === 0) continue;
    const planIds = new Set(plan[index].source_segment_ids);
    if (ids.some((id) => !planIds.has(id))) continue;

    const segmentText = citedText(ids, segmentsById);
    const complete =
      raw.kind === 'medicine'
        ? medicineComplete(text, segmentText)
        : raw.kind === 'follow_up'
          ? followUpComplete(text, segmentText)
          : testComplete(text, segmentText);
    if (!complete) continue;

    const item = {
      kind: raw.kind,
      text,
      plan_bullet_index: index,
      source_segment_ids: ids,
    };
    const key = checklistIdentity(item, segmentText);
    if (seen.has(key)) continue;
    seen.add(key);
    checklist.push(item);
    if (checklist.length >= CHECKLIST_CAP) break;
  }

  const warnings = [];
  const seenWarnings = new Set();
  const rawWarnings = Array.isArray(source.warnings) ? source.warnings : [];
  for (const raw of rawWarnings) {
    if (!raw || typeof raw !== 'object' || typeof raw.text !== 'string') continue;

    const text = stripDoctorPrefix(raw.text);
    if (!text) continue;

    const index = typeof raw.plan_bullet_index === 'string'
      ? Number(raw.plan_bullet_index)
      : raw.plan_bullet_index;
    if (!Number.isInteger(index) || index < 0 || index >= plan.length) continue;

    const ids = coerceIdList(raw.source_segment_ids, validIds);
    if (ids.length === 0) continue;
    const planIds = new Set(plan[index].source_segment_ids);
    if (ids.some((id) => !planIds.has(id))) continue;

    const segmentText = citedText(ids, segmentsById);
    if (!warningFaithful(text, segmentText)) continue;

    const key = contentTokens(text)
      .filter((token) => segmentText.toLowerCase().includes(token))
      .sort()
      .join('|');
    if (!key || seenWarnings.has(key)) continue;
    seenWarnings.add(key);
    warnings.push({ text, plan_bullet_index: index, source_segment_ids: ids });
    if (warnings.length >= WARNING_CAP) break;
  }

  const patient_summary = summary
    .filter((item) => !summaryLeaksTask(item.text, checklist) && !summaryRestatesWarning(item.text, warnings))
    .slice(0, SUMMARY_CAP);

  return { patient_summary, checklist, warnings };
}

module.exports = {
  SECTIONS,
  normalizeSoapNote,
  filterSegmentIds,
  isEmptyNote,
  normalizePatientDocuments,
};
