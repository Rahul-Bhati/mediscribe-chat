# Demo script — 45 seconds

Read this aloud while recording. It is synthetic: no real patient, no real data.

Two things make it work:

- **Say the role before each line.** "Doctor:" / "Patient:" — Whisper keeps the
  words, and the note-writer uses them to separate reported symptoms from exam
  findings.
- **Cover all four SOAP sections.** Symptoms, then numbers, then an impression,
  then a plan. Skip the impression and the Assessment section comes back empty.

Speak at a normal pace. Do not rush — Whisper handles natural speech better
than fast speech, and pauses give it clean segment boundaries.

---

**Doctor:** Good morning Marcus, how have you been since we last met?

**Patient:** Not great, honestly. My chest has been tight for about three days
now, and it goes up into my left shoulder.

**Doctor:** Does anything bring it on?

**Patient:** Walking up the stairs at home. I stop, and after a minute or two
it settles down.

**Doctor:** Any shortness of breath lying flat, or waking up at night gasping?

**Patient:** No, nothing like that. I sleep on one pillow, same as always.

**Doctor:** Any history of heart problems, in the family or for yourself?

**Patient:** No. I have never had anything with my heart before. My father had
diabetes, that is all.

**Doctor:** Your blood pressure today is one twelve over seventy, and your
weight is down about nine pounds since discharge.

**Doctor:** Your last blood test showed a potassium of four point two, and
kidney function that looks stable.

**Doctor:** This sounds like it could be angina, so I do not want to sit on it.

**Doctor:** I am going to refer you to cardiology this week, and I want to
repeat the echo before that appointment.

**Doctor:** Keep taking the carvedilol at six point two five milligrams twice a
day, and come back in two weeks.

---

## The shortest version that still fills all four sections

If you only have fifteen seconds:

> **Patient:** My chest has been tight for three days, and it spreads into my
> left shoulder when I climb stairs.
> **Doctor:** Blood pressure is one twelve over seventy, potassium four point
> two. This could be angina. I am referring you to cardiology this week and
> repeating the echo.

## If you get "no clinical content"

The mic and transcription worked — the app quotes back what it heard. The
recording just had nothing clinical in it. "Testing, testing, one two three"
produces exactly that message, correctly.
