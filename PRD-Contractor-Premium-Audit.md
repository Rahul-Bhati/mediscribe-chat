# PRD — Contractor Premium Audit

**Version:** 1.0
**Date:** 26 September 2026
**Status:** Ready for a pilot scope, not ready to code against a live carrier
**Working name:** Audit Desk

---

## 1. Summary

Audit Desk is a tool for construction companies that reviews a workers' compensation and general liability insurance audit, shows which charges are wrong, and drafts the dispute. A trained auditor checks every finding before anything is sent to the insurance company.

This document is the spec for the first version: one state, workers' compensation first, a human sign-off on every dispute, and a price tied to premium the contractor actually gets back.

---

## 2. Contacts

| Name | Role | Comment |
|---|---|---|
| Rahul | Founder | Owns product decisions and the pilot |
| — | Premium auditor (not hired yet) | Must approve every class code and every dispute. Do not ship without this person. |
| — | Pilot contractor (not named yet) | First real audit file. One company, one state. |
| — | Insurance broker (optional) | May introduce the contractor. Does not replace the auditor. |

No carrier, lawyer, or broker is a partner yet. Do not put a company logo on the product until there is a written agreement.

---

## 3. Background

**What this is about.** A contractor buys workers' compensation insurance with an estimate of payroll. Workers' compensation pays medical bills and lost wages when a worker is hurt on the job. At the end of the policy year, the insurance company audits the real payroll and sends a bill. That bill is often much higher than the contractor expected.

The audit turns on a few facts:

- **Class code.** A code for the kind of work. Roofing costs far more than clerical work. The wrong code changes the whole bill.
- **Subcontractor payroll.** If a subcontractor does not show proof of their own workers' compensation policy, the contractor's insurer can add that subcontractor's payroll to the contractor's bill.
- **What counts as pay.** The half-time part of overtime is often left out of the number the rate is applied to. Per diem and some other items can be left out too. Rules differ by state.
- **Officers.** Owners and officers can sometimes be included or left out. The form has to be filed on time.

The contractor usually has a short window after the bill, often measured in weeks, to dispute it. Miss the window and the bill stands.

**Who does this work today.**

| Who | What they actually do | Gap |
|---|---|---|
| The contractor's office | Pulls payroll reports, tax forms, and insurance certificates into a folder | They are not trained on the rule book. They often accept the bill. |
| The broker | Helps, then gets busy | Brokers are not a full-time audit desk. |
| PremiumAudit.ai | Experts review the bill. About $499 per hour. They say their software only drafts letters. A person writes the judgment. | Hourly consulting. Not a product that watches the year. |
| AuditReady | Stores payroll, subcontractor lists, and certificates so the audit packet is ready | Organization. It does not judge the class code or file the dispute. |
| Audit Monkey | A Florida service firm. They say they have fought audit bills for Florida contractors. | A local service team, not a national product. |
| Bevaya | Software for the insurance company's own auditors | Works for the carrier, who wants the premium to be complete. The contractor is the other side. |

**Why now.** Insurance companies are starting to use software to read payroll faster and bill more completely. The contractor's side is still a spreadsheet and a phone call. Reading a payroll PDF is now cheap. Knowing the rule, citing it, and getting a human to sign it is still rare. That second part is the product.

**Why this is possible now.** Models can pull numbers out of a payroll export, a tax form, and a certificate of insurance, and point at the page they came from. They cannot be trusted to invent a class code. The rule book has to be a separate, checked system. A person who has done audits for a carrier or a bureau still has to approve the result.

---

## 4. Objective

**The objective:** help a contractor cut a wrong audit bill, with every finding tied to a rule and a source document, and with a human auditor's name on the dispute.

**Why it matters to the customer.** A single wrong class code or a missing certificate can add tens of thousands of dollars. The contractor already pays someone to deal with this. They will pay again if the new way is faster and shows its work.

**Why it matters to the company.** The insurance company is automating its side. The contractor's side is still open. The money is easy to see: premium before, premium after, and the rule that explains the difference. That is a clean way to charge.

**What this is not.** Audit Desk does not sell insurance. It does not replace the broker. It does not tell a contractor that a worker is an employee or a contractor for tax law. It does not send a dispute until the human auditor and the contractor both approve it.

### Key Results

These are targets for the first pilot. They are not results we have measured.

| # | Key Result | Target | How to measure |
|---|---|---|---|
| KR1 | Finished pilot reviews | 10 contractor audits in one state, within 90 days of the first file | Count files marked "dispute sent" or "no dispute, customer accepted" |
| KR2 | Findings the auditor keeps | At least 8 of 10 cited findings survive auditor review without a rule change | Auditor marks each finding keep / edit / reject |
| KR3 | Source on every number | 100% of dollar amounts in a dispute letter trace to a page in the file | Click-through check on every sent letter |
| KR4 | Money the customer can see | Each sent dispute shows premium before, premium after, and the rules used | Letter template includes the three lines |
| KR5 | No silent send | 0 disputes leave the system without auditor approval and customer approval | Audit log of the two approvals |

A dollar target for "premium recovered" stays out of the OKRs until 10 real files exist. Early files will be too few to promise a savings rate.

---

## 5. Market Segment(s)

Markets here are jobs, not age or company size.

**Primary job — the contractor who just got a surprise audit bill.**
Their work is to pay a fair premium and get back to jobs. Their pain is a bill they cannot check, a deadline, and an office that does not know the rule book. The first version is for a contractor with roughly 10 to 200 employees, in one state, who already has a workers' compensation policy and a recent audit or a final audit worksheet.

**Secondary job — the office manager who builds the audit folder.**
Their work is to find payroll reports, quarterly tax forms (Forms 941), 1099s, and certificates of insurance before the auditor asks twice. Their pain is hunting through email and still missing a certificate.

**Channel job — the broker who does not want to lose the account.**
A bad audit bill makes the contractor angry at the broker. The broker will introduce Audit Desk if it makes them look useful and does not steal the policy sale. Brokers are not the user of version 1. They are a way to find the tenth customer, not the first.

**Later job — the controller at a general contractor in several states.**
Same pain, more entities, more class codes, wrap-up jobs, and more certificates. Out of scope until one state works.

**Constraints.**

- United States only.
- Version 1 is one state. Pick a state that uses the NCCI manual (the common class-code book) and where the founder or the hired auditor has done real audits. Do not start in Ohio, Washington, North Dakota, or Wyoming. Those states run their own state fund. The rules are different.
- California, New York, and a few other states use their own bureau, not NCCI. Stay out of them until the one NCCI state is solid.
- The customer must own the payroll files they upload. We do not take a carrier login in version 1.
- We do not give legal advice about whether someone is an employee.
- The NCCI Scopes Manual is copyrighted. We do not copy it into the product for the public. The auditor cites rules from a licensed copy. The product stores the rule number, a short quote the auditor confirms, and the link to the source document in the customer's file.

---

## 6. Value Proposition(s)

**Job to be done.** "Tell me if this audit bill is wrong, show the rule, and give me a letter I can send before the deadline."

**What the customer gains.**

- A list of findings, each with a dollar effect.
- The page in their own file that the number came from.
- The rule number the auditor relied on.
- A dispute letter they can send, after two approvals.
- A record of what was sent and when.

**Pains they avoid.**

- Paying overtime premium that the manual says to exclude.
- Paying for a subcontractor who already had their own policy, because the certificate was in an inbox and never attached.
- Missing the dispute window.
- Sending a letter that cites a rule that does not exist. That happens with a general chatbot. Carriers ignore those letters.

**Where we are better than the alternatives.**

| Alternative | What they are better at | What we do better |
|---|---|---|
| Do nothing | No fee | The contractor keeps overpaying |
| Broker, as a favor | They know the carrier | They will not review every class code on every job |
| PremiumAudit.ai | Deep experts | We are a repeatable file, not an open-ended hourly project. We start from the customer's payroll, not only from the finished bill. |
| AuditReady | Clean folders | We judge the bill and draft the dispute |
| Audit Monkey | Hands-on help in Florida | We are built to leave one state only after the rules work, and the product holds the file, not a single office |
| Bevaya and other carrier tools | Speed for the insurer | We work for the contractor |
| A general chatbot | Fast prose | It invents rules. We refuse to send a finding that has no rule id and no source page |

**Value curve, in plain words.** Customers already accept a high price when someone saves them premium. They do not accept a black box. Version 1 wins on cited rules, human sign-off, and speed to a letter. It does not win on being the system of record for insurance policies, and it does not try to.

---

## 7. Solution

### 7.1 UX and user flows

Five screens. No marketing site is required for the pilot. A login link by email is enough.

**Screen A — File home.** Policy year, carrier name, state, audit due date, status (waiting on documents, in review, waiting on auditor, waiting on customer, sent, closed).

**Screen B — Documents.** A list of what we have and what is missing: payroll register, quarterly tax forms, 1099s, audit worksheet from the carrier, certificates of insurance, officer inclusion or exclusion forms, overtime report.

**Screen C — Findings.** One row per finding. Columns: what is wrong, dollar effect, rule number, source page, status (draft, auditor kept, auditor edited, auditor rejected, customer accepted).

**Screen D — Dispute letter.** The letter in plain language. Premium before. Premium after. Each change points at a finding. Two buttons: auditor approves, customer approves. The send action stays off until both are on.

**Screen E — Outcome.** What the carrier replied. Premium change, or "carrier refused," or "deadline missed."

#### Flow 1 — The bill already arrived

1. Contractor creates a file and types the state, carrier, policy number, and the date the bill must be disputed.
2. They upload the audit bill, payroll, tax forms, and any certificates they have.
3. The system reads the documents and proposes findings. Each number links to a page.
4. The auditor opens the queue, keeps or edits or rejects each finding, and adds the rule citation from the licensed manual.
5. The contractor reads the letter and approves it.
6. The contractor sends it, or asks us to send it from their email after approval. Version 1 does not log into the carrier's website.
7. They record the carrier's answer.

#### Flow 2 — The audit has not happened yet

Same screens. The "bill" is empty. The product builds the packet the carrier will ask for and flags class codes and missing certificates before the auditor arrives. This flow is second. Do not build it in the first release.

#### Flow 3 — Not enough paper

If a certificate or a payroll register is missing, the finding says "cannot check" and does not invent a dollar savings. The office manager gets a short list of what to go find.

### 7.2 Key features

**F1. Audit file.** One policy year, one state, one contractor. Stores documents and the deadline.

**F2. Document reading.** Pulls payroll by person or by department, overtime dollars, 1099 totals, certificate holder, policy dates, and class codes printed on the carrier worksheet. Every extracted number keeps the file name and page.

**F3. Checklist of missing items.** Compares what was uploaded to the list for that state. Does not claim the audit is fine when a required document is absent.

**F4. Finding drafts.** The rules engine, not the chat model, creates the candidate findings. Examples of rules version 1 may include, only if the hired auditor confirms they apply in the pilot state:

- Overtime premium (the extra half) excluded from the payroll base.
- Subcontractor cost removed when a certificate shows workers' compensation in force for the same dates.
- Clerical or sales payroll split from field payroll when the records support the split.
- Officers included or excluded only when the filed form matches the audit.

If the auditor has not confirmed a rule for that state, the product does not offer it.

**F5. Auditor queue.** The auditor sees the draft, the page, and the suggested rule. They must choose keep, edit, or reject. An edit stores the old text and the new text.

**F6. Dispute letter.** Generated only from findings the auditor kept. No free-typed savings number that is not on a finding.

**F7. Two approvals, then a record.** Auditor and customer. The log stores who, when, and the exact letter PDF.

**F8. Deadline warning.** Email at 14 days, 7 days, and 2 days before the dispute date the customer entered. If they did not enter a date, the file shows "date unknown" and does not pretend there is time left.

**Out of version 1.** Carrier website login. Automatic sending. General liability audit. Several states. Year-round payroll watch. Broker dashboard. Charging the customer's card. Mobile app.

### 7.3 Technology

The model reads documents. The rules decide. The auditor signs. Those three stay separate.

| Piece | Choice for version 1 | Why |
|---|---|---|
| App | Web app. TypeScript. A simple React front end. | The office manager works at a desk. |
| API and jobs | Node server, or a small Python service for document jobs. One is enough. | Do not split into many services. |
| Database | Postgres | Files, findings, approvals, and the log. |
| Files | Private object storage. Encrypt at rest. | Payroll is sensitive. |
| Document reading | A document model that returns JSON plus a page citation. Reject a field with no page. | Stops made-up numbers. |
| Rules | Code and tables checked by the auditor. Not a prompt. | Class codes must be stable. |
| Manual text | Not stored as a public library. Auditor enters rule id and a short confirmed quote. | The NCCI book is copyrighted. |
| Email | Transactional email for login links and deadline warnings. | No carrier portal. |
| Review queue | A table of findings filtered to "needs auditor." | The whole product fails if this is slow. |
| Auth | Email magic link. One workspace per contractor. | No social login needed. |
| Logs | Append-only approval log. | KR5. |

**Payroll and certificate tools, by release.**

| Tool | Version 1 | Later |
|---|---|---|
| PDF and spreadsheet upload | Yes | Yes |
| QuickBooks Online export or read-only connection | Only if the first pilot already uses it | Yes |
| Gusto, ADP | No | After the first connection works |
| Foundation, Viewpoint Vista, Sage 300 CRE | No | When a general contractor asks and will pay for the integration |
| Certificate of insurance PDF | Yes, upload | Inbox forward later |
| Carrier audit portals | No login, no bot | Do not build this until a lawyer says the portal terms allow it |

**What the model is allowed to do.** Read a page. Copy a number. Point at the page. Draft a sentence from a finding the rules engine and the auditor already accepted.

**What the model is not allowed to do.** Pick a class code on its own. Invent a manual section. Change a dollar amount. Send email to a carrier. Decide that a 1099 worker is really an employee.

**Security, before any real payroll.**

- Access limited to the contractor's users and the auditor.
- No training of a public model on customer files.
- A written note on how long files are kept, and a way to delete a file.
- SOC 2 is not required to run the first 10 pilots with uploaded PDFs. It is required before a live payroll connection or before a second company trusts us with many entities. Say that to customers in plain words.

### 7.4 Assumptions

These are unproven. The pilot exists to test them.

| # | Assumption | How we will know |
|---|---|---|
| A1 | Contractors will upload a full audit file if we give them a checklist | 10 pilots either upload or tell us what they refuse to share |
| A2 | A former premium auditor will work the queue and trust the drafts enough to edit, not rewrite | KR2 |
| A3 | Carriers accept a letter that cites the manual and the customer's own pages | Record replies on the first disputes |
| A4 | Savings are large enough that a share of the reduction is an easier sale than an hourly fee | Ask the first 10 what they would have paid |
| A5 | One NCCI state is enough to learn the workflow | If the auditor says the state is a bad teacher, stop and pick another state before adding features |
| A6 | We can operate without copying the Scopes Manual into the database | Auditor workflow test in week 1 |
| A7 | Brokers will refer after they see one clean letter | Do not spend time on a broker portal until one broker asks twice |
| A8 | The dispute window the customer types in is the real window | Auditor confirms the date from the bill on every file |

### 7.5 User stories

Each story is for version 1 unless the title says Later. "Done" means the acceptance lines are true on a real file, not on fake sample data only.

#### Contractor owner

**US-1. See if the bill is worth fighting.**
As a contractor owner, I want the audit bill turned into a short list of possible mistakes with dollar amounts, so that I know whether to spend time on a dispute.

- Done when every amount links to a page in a document I uploaded.
- Done when a missing document produces "cannot check," not a guessed savings number.
- Done when the total at the top is the sum of findings the auditor kept, not the sum of drafts.

**US-2. Know the deadline.**
As a contractor owner, I want the dispute deadline on the file home, so that I do not miss the window.

- Done when I can type the date from the bill.
- Done when an empty date shows "date unknown" and blocks any sentence that says we are on time.
- Done when I get email at 14, 7, and 2 days if the letter is not sent.

**US-3. Approve the letter in plain language.**
As a contractor owner, I want to read the dispute letter and approve it, so that nothing goes to my insurer that I have not seen.

- Done when the letter uses the company name, policy number, and the kept findings only.
- Done when I can reject the letter and send it back with a note.
- Done when my approval stores my name, the time, and the PDF I approved.

**US-4. See what the insurer did.**
As a contractor owner, I want to record the insurer's reply and the new premium, so that I know if the fight worked.

- Done when I can mark accepted, partial, refused, or no reply.
- Done when the premium after is a number I type from the insurer's letter, not a number the model invents.

**US-5. Know what I will be charged.**
As a contractor owner, I want the fee explained before I upload payroll, so that I am not surprised.

- Done when the pilot agreement states the fee in one sentence. Suggested pilot fee: a fixed review fee, plus a share of premium the insurer actually reduces, and no share if the insurer refuses. Exact percents are a business choice, not a default hidden in the app.
- Done when the app does not collect a card in version 1. The invoice is outside the app.

#### Office manager

**US-6. Know which papers are missing.**
As an office manager, I want a checklist of documents for this audit, so that I stop guessing what the insurer will ask for.

- Done when the list includes payroll register, overtime breakdown, Forms 941, 1099 summary, carrier worksheet, certificates, and officer forms, with a state note from the auditor if one item does not apply.
- Done when each row is missing, uploaded, or not required.

**US-7. Upload messy files.**
As an office manager, I want to upload PDFs and spreadsheets with unclear names, so that I do not have to rename everything first.

- Done when the system suggests a document type and shows the pages it read.
- Done when I can correct the type.
- Done when a password-protected PDF is marked failed, not silently skipped.

**US-8. Match certificates to subcontractors.**
As an office manager, I want each subcontractor on the audit listed next to their certificate, so that I can see who will be charged to our policy.

- Done when a certificate is tied to a subcontractor name and a date range.
- Done when a certificate that ends before the work dates is flagged as not covering the job.
- Done when a subcontractor with no certificate stays on the "exposed" list.

**US-9. Hand the file to the auditor without a meeting.**
As an office manager, I want a "ready for review" button, so that the auditor does not start on a half-empty file.

- Done when the button is off until the checklist has no required item still missing, or I mark an item "we do not have it" with a reason.

#### Premium auditor

**US-10. Review only what the rules flagged.**
As the premium auditor, I want a queue of draft findings with the source page beside them, so that I spend time on judgment, not on retyping payroll.

- Done when I can open the source page from the finding.
- Done when I cannot approve a finding that has no source page.
- Done when I cannot approve a finding that has no rule id.

**US-11. Correct the machine.**
As the premium auditor, I want to edit the class code, the payroll dollars, and the rule quote, so that the letter matches the manual I am licensed to use.

- Done when the edit history keeps the draft and my version.
- Done when the letter updates from my version only.

**US-12. Reject a bad finding.**
As the premium auditor, I want to reject a finding with a reason, so that the customer never sees a savings number I do not believe.

- Done when a rejected finding is hidden from the customer letter and visible in the internal log.

**US-13. Refuse a file outside my state.**
As the premium auditor, I want the product to block a state I do not cover, so that we do not pretend to know that state's manual.

- Done when creating a file in any state other than the pilot state shows "not supported" and stores nothing.

**US-14. Sign the letter.**
As the premium auditor, I want my approval to freeze the PDF, so that a later edit cannot change what I signed.

- Done when a new edit after my approval clears my approval and the customer's approval.
- Done when the frozen PDF is the one stored on send.

#### Later stories (do not build in version 1)

**US-15. Watch class codes during the year.**
As a contractor owner, I want a warning when new hires are piled into a high-rate class code, so that I can fix payroll before the audit.

**US-16. General liability audit.**
As a contractor owner, I want the same review for the general liability audit, so that I do not run two processes.

**US-17. Several companies.**
As a controller, I want one login for several entities and states, so that I can see which file is late.

**US-18. Broker view.**
As a broker, I want to see status only, not payroll dollars, so that I can nudge the customer without holding their payroll.

**US-19. Read-only payroll connection.**
As an office manager, I want QuickBooks connected so that I do not export a register by hand.

---

## 8. Release

Relative time, for one founder plus one auditor working with real files. Not a promise of calendar dates.

**First 2 weeks — prove the letter, not the platform.**
One fake file built from a public sample, then one real file from the pilot contractor with their written okay. Upload only. Auditor uses the manual by hand and types rule ids. The output is a PDF letter. No login system if email and a shared folder get the first letter done faster. The point is to learn which findings the auditor keeps.

**Weeks 3 to 6 — version 1, the pilot product.**
Screens A through E. Checklist. Document reading with page citations. Rules limited to the ones the auditor confirmed in the first file. Auditor queue. Two approvals. Deadline emails. One state. Workers' compensation only. Upload, not payroll connections.

Ship this when KR3 and KR5 are true on three real files. Do not add a state to get there.

**Weeks 7 to 12 — only if the first 10 files show the auditor keeping findings.**
One payroll connection if the pilots use the same system. Certificate inbox. A simple way to record the insurer's reply so KR4 can be reviewed. Still one state.

**Not in the first three months.** General liability. A second state. Carrier portal bots. A broker product. A mobile app. SOC 2 paperwork, unless a pilot contract requires it. Automatic class-code assignment.

**How we decide to continue.** After 10 files, look at KR2 and the insurer replies. If the auditor rewrites most findings, the rules are not ready. Fix the rules before any new feature. If insurers ignore even well-cited letters, the channel is wrong and more software will not fix it.
