const test = require('node:test');
const assert = require('node:assert/strict');

const { isEmptyBrief, normalizePrep } = require('./prep');

const segments = [
  { id: 0, text: 'I am coming in because my chest has been tight for three days.' },
  { id: 1, text: 'The tightness goes into my left shoulder when I climb stairs.' },
  { id: 2, text: 'I take the heart pill twice a day.' },
  { id: 3, text: 'My daughter is telling you this because I forget the details.' },
];

test('an invented question and a renamed medicine are dropped', () => {
  const brief = normalizePrep(
    {
      brief: {
        reason: {
          text: 'Chest has been tight for three days.',
          source_segment_ids: [0],
        },
        symptoms: [
          {
            text: 'Tightness into the left shoulder when climbing stairs.',
            source_segment_ids: [1],
          },
        ],
        medicines: [
          { text: 'carvedilol 6.25 mg twice a day', source_segment_ids: [2] },
          { text: 'the heart pill twice a day', source_segment_ids: [2] },
        ],
        questions: [
          { text: 'You should get an electrocardiogram tomorrow.', source_segment_ids: [1] },
        ],
      },
    },
    segments
  );

  assert.equal(brief.reason.text.includes('three days'), true);
  assert.equal(brief.symptoms.length, 1);
  assert.deepEqual(
    brief.medicines.map((item) => item.text),
    ['the heart pill twice a day']
  );
  assert.deepEqual(brief.questions, []);
});

test('a statement-only recording produces no questions', () => {
  const brief = normalizePrep(
    {
      brief: {
        reason: null,
        symptoms: [],
        medicines: [],
        questions: [{ text: 'Ask about an echocardiogram.', source_segment_ids: [1] }],
      },
    },
    segments
  );
  assert.deepEqual(brief.questions, []);
});

test('invented segment ids and an empty brief are rejected', () => {
  const brief = normalizePrep(
    {
      brief: {
        reason: { text: 'Chest tightness for three days.', source_segment_ids: [40] },
        symptoms: [{ text: 'Shoulder pain when climbing stairs.', source_segment_ids: ['nope'] }],
        medicines: [],
        questions: [],
      },
    },
    segments
  );
  assert.equal(isEmptyBrief(brief), true);
});

test('lists are capped', () => {
  const many = Array.from({ length: 9 }, (_, index) => ({
    id: index,
    text: `Symptom marker ${index} is shoulder pain when climbing stairs today.`,
  }));
  const brief = normalizePrep(
    {
      brief: {
        reason: null,
        symptoms: many.map((segment) => ({
          text: `Shoulder pain when climbing stairs, marker ${segment.id}.`,
          source_segment_ids: [segment.id],
        })),
        medicines: many.map((segment) => ({
          text: `marker ${segment.id}`,
          source_segment_ids: [segment.id],
        })),
        questions: [],
      },
    },
    many
  );
  assert.equal(brief.symptoms.length, 6);
  assert.equal(brief.medicines.length, 8);
});
