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

module.exports = { SECTIONS, normalizeSoapNote, filterSegmentIds, isEmptyNote };
