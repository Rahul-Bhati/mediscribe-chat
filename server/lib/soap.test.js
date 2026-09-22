const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizePatientDocuments } = require('./soap');

function noteWithPlan(bullets) {
  return {
    soap_note: {
      subjective: [],
      objective: [],
      assessment: [],
      plan: bullets,
    },
  };
}

const carvedilolSegment = {
  id: 11,
  text: 'Keep taking the carvedilol 6.25 mg twice a day and come back in two weeks.',
};

test('missing or mistyped extras become empty arrays and leave the note alone', () => {
  const note = noteWithPlan([{ text: 'Follow up.', source_segment_ids: [11] }]);
  const result = normalizePatientDocuments(null, note, [carvedilolSegment]);
  assert.deepEqual(result, { patient_summary: [], checklist: [] });

  const mistyped = normalizePatientDocuments(
    { patient_summary: 'nope', checklist: { kind: 'medicine' } },
    note,
    [carvedilolSegment]
  );
  assert.deepEqual(mistyped, { patient_summary: [], checklist: [] });
  assert.equal(note.soap_note.plan.length, 1);
});

test('a checklist item that cites a segment outside its plan bullet is removed', () => {
  const note = noteWithPlan([{ text: 'Keep carvedilol.', source_segment_ids: [11] }]);
  const result = normalizePatientDocuments(
    {
      checklist: [
        {
          kind: 'medicine',
          text: 'keep carvedilol 6.25 mg twice a day',
          plan_bullet_index: 0,
          source_segment_ids: [11, 4],
        },
      ],
    },
    note,
    [carvedilolSegment, { id: 4, text: 'Blood pressure is 112 over 70.' }]
  );
  assert.deepEqual(result.checklist, []);
});

test('an invented segment id is stripped, and a bad plan index drops the item', () => {
  const note = noteWithPlan([{ text: 'Keep carvedilol.', source_segment_ids: [11] }]);
  const kept = normalizePatientDocuments(
    {
      checklist: [
        {
          kind: 'medicine',
          text: 'keep carvedilol 6.25 mg twice a day',
          plan_bullet_index: '0',
          source_segment_ids: ['11', '99'],
        },
      ],
    },
    note,
    [carvedilolSegment]
  );
  assert.equal(kept.checklist.length, 1);
  assert.deepEqual(kept.checklist[0].source_segment_ids, [11]);

  const dropped = normalizePatientDocuments(
    {
      checklist: [
        {
          kind: 'medicine',
          text: 'keep carvedilol 6.25 mg twice a day',
          plan_bullet_index: 3,
          source_segment_ids: [11],
        },
      ],
    },
    note,
    [carvedilolSegment]
  );
  assert.deepEqual(dropped.checklist, []);
});

test('one plan bullet can produce two medicines, and a duplicate drug is dropped', () => {
  const segment = {
    id: 2,
    text: 'Keep carvedilol 6.25 mg twice a day and start aspirin 81 mg once a day.',
  };
  const note = noteWithPlan([{ text: 'Medicines.', source_segment_ids: [2] }]);
  const result = normalizePatientDocuments(
    {
      checklist: [
        {
          kind: 'medicine',
          text: 'keep carvedilol 6.25 mg twice a day',
          plan_bullet_index: 0,
          source_segment_ids: [2],
        },
        {
          kind: 'medicine',
          text: 'start aspirin 81 mg once a day',
          plan_bullet_index: 0,
          source_segment_ids: [2],
        },
        {
          kind: 'medicine',
          text: 'continue carvedilol 6.25 mg twice a day',
          plan_bullet_index: 0,
          source_segment_ids: [2],
        },
      ],
    },
    note,
    [segment]
  );
  assert.equal(result.checklist.length, 2);
  assert.equal(result.checklist[0].text.includes('carvedilol'), true);
  assert.equal(result.checklist[1].text.includes('aspirin'), true);
});

test('a medicine item that drops the dose or the frequency is removed', () => {
  const segment = { id: 11, text: 'Keep taking carvedilol 6.25 mg twice a day.' };
  const note = noteWithPlan([{ text: 'Medicine.', source_segment_ids: [11] }]);

  const missingDose = normalizePatientDocuments(
    {
      checklist: [
        {
          kind: 'medicine',
          text: 'keep carvedilol',
          plan_bullet_index: 0,
          source_segment_ids: [11],
        },
      ],
    },
    note,
    [segment]
  );
  assert.deepEqual(missingDose.checklist, []);

  const missingTwice = normalizePatientDocuments(
    {
      checklist: [
        {
          kind: 'medicine',
          text: 'keep carvedilol 6.25 mg',
          plan_bullet_index: 0,
          source_segment_ids: [11],
        },
      ],
    },
    note,
    [segment]
  );
  assert.deepEqual(missingTwice.checklist, []);
});

test('a follow-up that drops its time and a test that drops "before" are removed', () => {
  const note = noteWithPlan([
    { text: 'Return.', source_segment_ids: [3] },
    { text: 'Echo.', source_segment_ids: [4] },
  ]);
  const segments = [
    { id: 3, text: 'Come back in two weeks.' },
    { id: 4, text: 'Repeat the echo before that appointment.' },
  ];
  const result = normalizePatientDocuments(
    {
      checklist: [
        {
          kind: 'follow_up',
          text: 'come back soon',
          plan_bullet_index: 0,
          source_segment_ids: [3],
        },
        {
          kind: 'follow_up',
          text: 'come back in two weeks',
          plan_bullet_index: 0,
          source_segment_ids: [3],
        },
        {
          kind: 'test',
          text: 'repeat the echo',
          plan_bullet_index: 1,
          source_segment_ids: [4],
        },
        {
          kind: 'test',
          text: 'repeat the echo before that appointment',
          plan_bullet_index: 1,
          source_segment_ids: [4],
        },
      ],
    },
    note,
    segments
  );
  assert.deepEqual(
    result.checklist.map((item) => item.text),
    ['come back in two weeks', 'repeat the echo before that appointment']
  );
});

test('summary and checklist are capped, and an empty plan keeps no tasks', () => {
  const segments = [{ id: 1, text: 'My chest has been tight for three days and it hurts in the shoulder.' }];
  const summary = Array.from({ length: 7 }, (_, index) => ({
    text: `Tight chest on day marker ${index} in the shoulder.`,
    source_segment_ids: [1],
  }));
  const drugs = [
    'amoxicillin',
    'ibuprofen',
    'lisinopril',
    'metformin',
    'atorvastatin',
    'omeprazole',
    'levothyroxine',
    'amlodipine',
    'gabapentin',
  ];
  const plan = drugs.map((drug, index) => ({
    text: drug,
    source_segment_ids: [index + 10],
  }));
  const drugSegments = drugs.map((drug, index) => ({
    id: index + 10,
    text: `Take ${drug} 10 mg daily.`,
  }));
  const checklist = drugs.map((drug, index) => ({
    kind: 'medicine',
    text: `take ${drug} 10 mg daily`,
    plan_bullet_index: index,
    source_segment_ids: [index + 10],
  }));

  const capped = normalizePatientDocuments(
    { patient_summary: summary, checklist },
    noteWithPlan(plan),
    [...segments, ...drugSegments]
  );
  assert.equal(capped.patient_summary.length, 6);
  assert.equal(capped.checklist.length, 8);
  assert.equal(capped.checklist.some((item) => item.text.includes('gabapentin')), false);

  const emptyPlan = normalizePatientDocuments(
    {
      checklist: [
        {
          kind: 'follow_up',
          text: 'come back in two weeks',
          plan_bullet_index: 0,
          source_segment_ids: [3],
        },
      ],
    },
    noteWithPlan([]),
    [{ id: 3, text: 'Come back in two weeks.' }]
  );
  assert.deepEqual(emptyPlan.checklist, []);
});

test('summary bullets that restate a task or say "you have" are removed', () => {
  const note = noteWithPlan([
    { text: 'Medicine.', source_segment_ids: [11] },
    { text: 'Return.', source_segment_ids: [12] },
  ]);
  const result = normalizePatientDocuments(
    {
      patient_summary: [
        { text: 'Your chest has felt tight for about three days.', source_segment_ids: [1] },
        { text: 'You take carvedilol every day.', source_segment_ids: [11] },
        { text: 'Come back in two weeks.', source_segment_ids: [12] },
        { text: 'You have angina.', source_segment_ids: [1] },
        { text: 'The doctor said this could be angina.', source_segment_ids: [1] },
      ],
      checklist: [
        {
          kind: 'medicine',
          text: 'keep carvedilol 6.25 mg twice a day',
          plan_bullet_index: 0,
          source_segment_ids: [11],
        },
        {
          kind: 'follow_up',
          text: 'come back in two weeks',
          plan_bullet_index: 1,
          source_segment_ids: [12],
        },
      ],
    },
    note,
    [
      { id: 1, text: 'My chest has been tight for three days. The doctor said this could be angina.' },
      carvedilolSegment,
      { id: 12, text: 'Come back in two weeks.' },
    ]
  );

  assert.deepEqual(
    result.patient_summary.map((item) => item.text),
    [
      'Your chest has felt tight for about three days.',
      'The doctor said this could be angina.',
    ]
  );
});
