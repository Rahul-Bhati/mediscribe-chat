# Follow-through spec

Five additions on top of the visit note and the prep brief. The earlier contract still holds: no login, nothing stored on the server, no diagnosis, no treatment advice, English chart note, disclaimer first on every share. These five do not add WhatsApp, an account, or a server-side record.

## 1. Share the patient summary

The visit card gets **Share text**, the same handoff the prep brief already has.

The share body contains only:

1. First line: `Automated summary of what was said, not medical advice.`
2. In plain English (the patient summary).
3. To do (each line prefixed `The doctor said:`).
4. If this happens (each warning prefixed `The doctor said:`).

The SOAP note and the transcript stay on the phone. The share sheet opens only when the person taps the button. The app does not send the text anywhere by itself.

## 2. Allergies on the prep brief

The brief gains an **Allergies** section, copied in the speaker’s words.

- “Allergic to penicillin” stays “allergic to penicillin”.
- “The white pill” stays “the white pill”. A drug name that was not spoken is dropped.
- Every content word and every digit in the line must appear in the cited segment.
- Cap 6. Empty copy: `None stated`.
- Included in the prep share text. An allergies-only recording is still a brief.

## 3. Warning signs, as their own list

A visit response gains `warnings`, separate from the checklist. Checklist kinds stay `medicine`, `test`, and `follow_up`.

- A warning is a condition the doctor told them to watch for (“come back if the pain starts at rest”).
- A dated return (“come back in two weeks”, “this week”) stays `follow_up`.
- Each warning cites a plan bullet, and its segment ids are a subset of that bullet’s ids.
- Every content word and every digit must appear in the cited segment. “Go to the emergency room” is kept only when those words were said.
- The app does not rank urgency and does not tell anyone to seek emergency care.
- UI prefix: `The doctor said:`. Cap 4. Empty copy: `No warning signs were stated.`
- A summary bullet that restates a warning (the whole line, or three or more shared content words) is dropped. The warning list is the only place that instruction lives.

## 4. Patient-facing text in the language that was spoken

`soap_note` stays English.

`patient_summary`, checklist text, and warnings are written in the language the patient spoke, including Hindi or a mix. Doses, drug names, and numbers are copied, not translated.

Prep lines (reason, symptoms, medicines, allergies, questions) stay in the language that was spoken.

There is no second translation call. The normalizer does not reject non-English text. A line is dropped only when its citation, dose, or spoken words fail the rules above.

## 5. Keep a visit on this phone

After a visit note or a prep brief, **Keep on this phone** writes that card to the device. Nothing is written until the tap.

- Visit cards store the note, summary, checklist, warnings, and transcript.
- Prep cards store the brief and transcript.
- Audio is still deleted after the server answers. A kept card has no recording.
- Native: `saved-visits.json` in the app document directory. Web: `localStorage`. Never the server.
- **Delete** asks once, then removes that card from the phone and from the chat.
- On the next launch, kept cards are shown again above the welcome message.
- There is no account and no sync.

## Out of scope

WhatsApp or any automatic send. Accounts. A server copy. Speaker labels. A longer recording cap. Turning the typed composer into a chat model.
