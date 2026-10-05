# Spec: contract update, `shared` package and the full frontend on mocks

Status: ready-for-agent
Package: shared, frontend (plus the root design docs)
Decisions behind this spec: [decisions.md](decisions.md)

## Problem Statement

The product is designed (architecture, REST contract, CV state machine) but nothing is built: the
frontend is an empty page, `shared` and the backend do not exist. The developer wants to build and
see the whole product in the browser first — sign up, create a CV for a target role, watch the
generation, answer questions, edit, download a PDF — before the server exists, and needs a
guarantee that the flow and the API the frontend is built against are the ones the backend will
later implement.

The design set also has gaps that block a correct frontend: the draft has only five blocks and a
fixed block order, the rules for required and optional blocks are not written down, several API
details are ambiguous (partial PATCH, ids of new items, what happens to a question when its item
is deleted), and seven design decisions are still marked "to confirm".

## Solution

1. **The contract is brought up to date** in the design docs: eight blocks with their own schemas,
   a block order the user can change, required and optional blocks, the role context, and the
   clarified API rules.
2. **`shared` becomes real**: the Zod schemas of the REST contract, the draft schema, the CV
   status machine, the CV language list and the match computation — the contract in code that both
   apps import.
3. **The frontend is built completely against that contract.** In **mock mode** — switched on
   explicitly by the developer — every API request is answered in the browser by handlers that
   behave like the backend: they persist data across reloads, run a fake generation through the
   real statuses, produce questions of every kind, enforce limits and return the documented
   errors. Outside mock mode the same frontend talks to the real API with no code change.

The backend is the next spec; it will implement the same contract and can be checked against the
same schemas.

## User Stories

### Account

1. As a visitor, I want to sign up with an email and a password, so that my CVs are private to me.
2. As a visitor, I want to see why sign-up failed (invalid email, short password, email already
   taken) next to the field, so that I can fix it.
3. As a returning user, I want to log in, so that I find my CVs from any device.
4. As a user who mistyped credentials, I want one neutral error message, so that the app does not
   reveal which emails are registered.
5. As a signed-in user, I want to stay signed in after a page reload, so that I do not log in
   again on every visit.
6. As a signed-in user, I want to log out, so that the next person on this device cannot see my CVs.
7. As a visitor opening a deep link to a CV, I want to be sent to the login screen and returned to
   that link afterwards, so that shared bookmarks keep working.
8. As a user whose session expired, I want to be taken to the login screen instead of seeing a
   broken page, so that I understand what happened.

### My CVs

9. As a user, I want a list of my CVs with title, target role, status, number of open questions
   and last update, so that I can see where each one stands.
10. As a new user, I want an empty state that explains what I need to start, so that I know the
    first step.
11. As a user, I want the list to update by itself while CVs are being generated, so that I do
    not reload the page.
12. As a user, I want to delete a CV in any status with a two-step confirmation, so that I do not
    delete one by accident.
13. As a user, I want to retry a failed CV straight from the list, so that I do not re-enter my
    background.
14. As a user, I want the dates in the list in my device's locale, so that they read naturally.

### Creating a CV

15. As a user, I want to name the target role, so that the CV is written for that position.
16. As a user, I want to optionally add role context — a short note or a pasted vacancy — so that
    the summary and the ordering fit the role better.
17. As a user, I want to pick the CV language (English by default), so that the CV, its questions
    and its headings come in that language.
18. As a user, I want to type or paste my background as free text, so that I can start without a
    file.
19. As a user, I want to upload a PDF and see the extracted text in the same text area, so that I
    can check and fix exactly what the AI will read.
20. As a user, I want a clear message when my file is not a PDF, is too large, has too many pages
    or is a scan without text, so that I know to paste the text instead.
21. As a user, I want a character counter and the limits shown on the form, so that I do not hit
    them on submit.
22. As a user, I want the submit button disabled while the request is running, so that I do not
    create the CV twice.
23. As a user who has reached the hourly limit or already has two CVs in progress, I want a message
    that says when I can try again, so that I am not left guessing.
24. As a user, I want to land on the new CV's page right after submitting, so that I can watch its
    progress.

### Generation in progress

25. As a user, I want to see that my CV is queued and how many are ahead of me, so that I know it
    was accepted.
26. As a user, I want to see the current stage of generation in plain words, so that the screen
    never looks frozen.
27. As a user, I want to see "attempt 2 of 3" when an attempt fails and is retried, so that I know
    the app is handling it.
28. As a user, I want to reload or close the page during generation and find the CV still
    progressing, so that I lose nothing.
29. As a user, I want to start a second CV while the first is generating, so that I am not blocked.
30. As a user, I want a readable error and a Retry button when generation fails for good, so that
    I can try again.
31. As a user, I want to delete a CV while it is being generated, so that I can cancel a mistake.

### The draft and its blocks

32. As a user, I want my draft split into Contacts, Summary, Experience, Projects, Education,
    Certifications, Skills and Languages, so that each kind of information has its proper place.
33. As a user without education, projects, certificates or listed languages, I want those blocks
    to be absent from the CV, so that it has no empty headings.
34. As a user whose contacts, summary, skills or experience are missing, I want the app to ask me
    about them and mark them as missing, so that the CV is not sent out incomplete by accident.
35. As a user with no work experience, I want to skip the experience question, so that I am not
    forced to invent one.
36. As a user, I want to change the order of blocks (with Contacts always on top), so that the
    strongest part of my CV comes first.
37. As a user, I want to reorder, add and remove items inside Experience, Projects, Education,
    Certifications and Languages, so that the CV reflects my priorities.

### Questions

38. As a user, I want a list of open questions with their count, so that I know what the AI could
    not find or confirm.
39. As a user, I want each question to say which part of the CV it is about, so that I understand
    the context.
40. As a user, I want to pick from options or choose "Other" and type my own, so that common
    answers take one tap.
41. As a user, I want to tick the skills I really have from a suggested list and add others, so
    that only true skills enter the CV.
42. As a user, I want to confirm or reject a quoted claim the AI could not verify, so that nothing
    unconfirmed stays in my CV.
43. As a user, I want to answer in free text, so that I can give dates, names and numbers.
44. As a user, I want to skip a question, so that I am not forced to share something.
45. As a user, I want my answer to appear in the matching field at once, so that I see the result.
46. As a user with unsaved edits, I want them saved before my answer is applied, so that neither
    overwrites the other.
47. As a user, I want to see past questions with my answers collapsed below, so that I can recall
    what I said.
48. As a user who filled a field by hand, I want its question to stay open until I answer or skip
    it, so that nothing is closed behind my back.
49. As a user who deleted an item, I want the questions about it to disappear, so that I am not
    asked about something that is gone.
50. As a user, I want the CV to become "Ready" when the last open question is closed, so that I
    know I am done.

### Editing

51. As a user, I want to edit every field of every block by hand, so that the CV says exactly what
    I want.
52. As a user, I want a save bar that appears when I have unsaved changes, with Save and Cancel, so
    that I control when changes are stored.
53. As a user, I want to rename the CV, so that I can tell my CVs apart in the list.
54. As a user who edited the same CV in another tab or device, I want a conflict notice with
    "Reload latest", so that I do not silently overwrite newer work.
55. As a user, I want a live preview of the A4 sheet while I type, so that I see the result before
    downloading.
56. As a user leaving the page with unsaved changes, I want a warning, so that I do not lose them.
57. As a user, I want to see how many facts were confirmed by my source and how many were sent to
    me to confirm, so that I trust the draft.

### PDF

58. As a user, I want to download the CV as an A4 PDF, so that I can send it to an employer.
59. As a user with unsaved edits, I want the download to save them first, so that the file matches
    what I see.
60. As a user with open questions or missing required blocks, I want to download anyway with a
    note about what is missing, so that I am never stuck.
61. As a user, I want a readable message when the download fails, so that I can retry.

### Phone

62. As a phone user, I want one panel at a time — Edit, Questions, Preview — with a switch between
    them, so that the screen is not cramped.
63. As a phone user, I want large touch targets, no zoom on input focus and a save bar that stays
    above the system gesture area, so that editing is comfortable.

### Second layer (cut first if time runs out)

64. As a user, I want to see which requirements of the role my CV covers and which it does not, so
    that I know what to add if it is true.
65. As a user, I want the match to update as I type or answer, so that I see the effect at once.
66. As a user, I want "Also fits" role suggestions that create a new CV from the same source and
    facts, so that I can target another role without re-entering anything.
67. As a user, I want to see how many generations I have left this hour, so that the limit is not
    a surprise.
68. As a user, I want my unsent New CV form to survive a reload, so that I do not retype it.
69. ~~As a user, I want a dark theme that follows my device, so that the app is comfortable at night.~~
    Dropped 2026-10-05: light theme only (`frontend/docs/design.md`).

### Developer

70. As a developer, I want to run the whole frontend without a backend in mock mode, so that I can
    build and demo every screen before the server exists.
71. As a developer, I want mock mode to keep its data across reloads, so that the reload-safety
    requirement can be exercised.
72. As a developer, I want to trigger each generation outcome on demand (success with questions,
    success without questions, retry then success, final failure), so that I can see every status
    without waiting for luck.
73. As a developer, I want mock responses to be validated by the same schemas as real ones, so
    that the mocks cannot drift from the contract.
74. As a developer, I want the frontend without mock mode to show a clear error with Retry when the
    API is down, so that fake data is never mistaken for a working system.
75. As a backend developer, I want the request and response schemas as importable code, so that
    the API I build is checked against exactly what the frontend expects.

## Implementation Decisions

### Order of work

- `shared` first, then the frontend on mocks. The backend is a separate spec.
- The contract docs (`docs/api.md`, `docs/architecture.md`, `docs/cv-statuses.md` and their
  `docs/uk/` copies) are updated in the same change as the `shared` code that implements them.

### Contract changes

**Draft (`CvData`) — eight blocks.** Every field may be empty, because the AI must not invent it.

| block | shape | limits |
|---|---|---|
| contacts | full name, email, phone, location; list of links (plain strings) | ≤ 5 links |
| summary | one text | 2–4 sentences expected |
| experience | items: id, title, company, period, bullets | ≤ 10 items, ≤ 12 bullets × ≤ 400 chars |
| projects | items: id, name, period, url, bullets | ≤ 6 |
| education | items: id, institution, degree, period | ≤ 6 |
| certifications | items: id, name, issuer, year | ≤ 10 |
| skills | flat list of strings, without languages | ≤ 40 × ≤ 60 chars |
| languages | items: id, name, level | ≤ 8 |

- `period`, `year` and `level` are free text kept as in the source; a missing language level
  becomes a `choice` question (A1–C2, Native, Other).
- Courses, awards, publications, volunteering and interests are not blocks.

**Block order.** The draft carries `sectionOrder`: the seven movable blocks (all except contacts),
each exactly once; the server rejects anything else. Contacts is always first. The default order
is fixed, not chosen by the model: summary, experience, projects, education, certifications,
skills, languages. Preview and PDF render blocks in this order and skip empty ones.

**Required and optional blocks.**

| block | required | when empty after generation |
|---|---|---|
| contacts (full name and at least one of email / phone) | yes | a question per empty required field |
| summary | yes | a question |
| skills | yes | the `multi` question built from the role's requirements |
| experience | yes, "no experience" allowed | a skippable question |
| education, projects, certifications, languages | no | block absent, no question |

An empty required block is marked "missing" in the editor and listed in a warning next to the PDF
button; it never blocks the download. Inside an existing item, an empty title / company / period
(experience) or institution (education) produces a question; other empty fields do not. The cap of
12 open questions per CV stays, most important first.

**Question target.** A question's target section covers all eight blocks; item-level targets work
for experience, projects, education, certifications and languages.

**Role context.** `roleNote` is renamed `roleContext`, limit 5 000 characters. It may hold a note
or a pasted vacancy; it describes the role and is never a source of facts. The target role title
stays the required, main input.

**`PATCH /api/cvs/:id`.**
- Body: version, optional title, optional draft; at least one of title / draft is required.
- Ids of new items are generated by the client; the server checks that they are UUIDs and unique
  within the draft. One draft schema serves requests and responses.
- An item whose every field is empty is dropped on save.
- Questions that target a removed item become `skipped`; if none stays open the CV becomes `ready`
  — so this endpoint can change the status. An answer to a question whose target no longer exists
  returns `409 INVALID_STATE`.
- Filling a field by hand does not close a question about it.

**Facts** belong to one CV; they are copied only when a new CV is created from it for another
role. There is no "regenerate" action and `ready` stays final.

**Confirmed design decisions** (architecture.md §13 rows 1–5, 7, 8) are marked confirmed: keyword
match without a model score, `retrying` as its own status, server-side PDF text extraction with
user review, AnswerAgent designed but built last, English UI, explicit Save with save-before-answer.

### `shared` package

- A workspace package with no runtime dependency except Zod, pure code, no I/O, consumable by the
  Vite frontend and the NestJS backend.
- Modules: CV status machine (statuses, transitions, groups, generation stages); draft schema with
  limits, block list, default block order and the "is this block empty / required" rules;
  question and answer schemas; requirement schema; CV language allow-list (code, English name,
  native name, block headings for all eight blocks); match computation; request and response
  schemas of every endpoint in the REST contract, including the error envelope and error codes.
- The "what is missing" rule (which required blocks and fields are empty) is one pure function in
  `shared`, used by the editor's warnings now and by the backend's auto questions later.
- Match searches summary, titles, bullets (experience and projects) and skills.

### Frontend

- **Structure** follows the frontend conventions: app (router, providers, layouts, error
  boundary), features (auth, CV list, CV create, CV editor), shared (API client, UI primitives,
  formatting).
- **API client:** one fetch wrapper, same-origin credentials, parses every response with the
  `shared` schema and throws a typed error carrying status, code, message and details. A `401`
  clears the current user and the router redirects to login.
- **Server state:** TanStack Query only. Query option factories per feature; mutations that return
  the full CV write it to the cache.
- **Polling:** the list and the CV page poll the lightweight statuses endpoint every 3 s while any
  CV is in progress; when a CV leaves that group its detail and the list are invalidated. The full
  CV is never polled.
- **Routes:** login, sign-up, My CVs, New CV, CV (content chosen by status group), not found.
  Protected routes load the current user first and redirect to login with a return address.
- **CV page by status group:** in progress — progress card; failed — error with Retry and Delete;
  has draft — editor with side panel.
- **Editor:** one form over the whole draft, remounted when the server version changes; arrays for
  item blocks with add / remove / up / down; block order changed with up / down buttons; bullets
  edited as one text area, one per line; skills as chips. Dirty state is read only by the save
  bar. Preview (and Match in the second layer) render from deferred form values.
- **Questions panel:** open questions as cards by kind (`text`, `choice` with Other, `multi` with
  Other, `confirm`), Skip for all but `confirm`; closed questions collapsed under "Answered (N)".
  Unsaved edits are saved before an answer or skip is sent; a failed save stops the answer.
- **PDF download:** the button reads "Save & download" when the form is dirty and saves first;
  then the file is fetched as a blob and handed to the browser with the filename from the
  response header. Errors are shown next to the button.
- **Layout:** two columns from 980 px; below it one panel at a time behind a segmented control;
  mobile-first styles, design tokens from the prototype.
- **Preview** is an HTML A4 sheet rendered from unsaved form values, in the CV language's
  headings, in `sectionOrder`, skipping empty blocks and fields.

### Mock mode

- Switched on only by an explicit development flag (a dedicated dev command). Never selected
  automatically; not included in the production build.
- Implemented as network-level request handlers, so the real API client, schema parsing, error
  handling and polling run unchanged. The same handlers back the frontend tests.
- State lives in browser storage: users, session, CVs, questions. Reload loses nothing.
- A fake worker advances CVs on timers through `queued` → `generating` (stages) → result, driven
  by elapsed time so that it also progresses across reloads.
- The draft comes from one fixture (an English backend-engineer CV with all eight blocks and
  questions of all four kinds), not from the typed text.
- Scenario by keyword in the target role: `fail` → `failed`; `retry` → `retrying` then success;
  `ready` → success without questions; anything else → `needs_input`.
- Enforced like the real API: ownership (`404` for another user's CV), allowed actions per status
  (`409 INVALID_STATE`), version conflict, validation errors, two CVs in progress, hourly limits.
- PDF ingest returns fixture text for any file but checks for real: not a PDF → `415`, over
  5 MB → `413`, filename containing `scan` → `422`.
- PDF download returns a static A4 file from fixtures.
- Answers are applied by a simple rule (scalar target → write the value; skills → append;
  `confirm` yes → append the claim) — enough to show the flow, not a copy of backend logic.

### Delivery layers

- **First pass:** user stories 1–63 and 70–75.
- **Second layer, separate tickets:** stories 64–69 (Match panel, suggested roles, usage, form
  autosave; dark theme dropped). `computeMatch` and the requirements schema are still built in `shared`
  in the first pass, because the list item and the backend need them.

## Testing Decisions

A good test here exercises behaviour a user or a consumer of the package can observe — what is on
the screen after an action, what a function returns for an input — and never component internals,
hook state or query keys. There are no tests in the repo yet, so these set the pattern. Vitest is
the single runner (architecture.md §4).

**Seam 1 — the public functions of `shared`.** Unit tests on:
- the status machine: allowed and forbidden transitions, group membership;
- the draft schema: limits, `sectionOrder` must be a permutation of the seven movable blocks,
  duplicate item ids rejected;
- the "what is missing" rule: required versus optional blocks, "no experience" case;
- `computeMatch`: normalisation, word boundaries, covered / not covered, where found;
- answer schemas per question kind.

**Seam 2 — the network boundary of the frontend.** The application is rendered with its real
router, providers and API client; the network is answered by the mock-mode handlers; tests act
through the DOM as a user would. This is the only frontend seam. Covered:
- status → screen mapping: each of the six statuses shows the right card and actions;
- generation: create → progress → draft appears without a manual reload;
- questions: validation per kind, answer updates the field, skip, last question → Ready,
  save-before-answer;
- editing: Save, version conflict notice, deleting an item removes its question;
- auth: redirect to login with return address, `401` handling;
- intake errors: wrong file type, too large, scan;
- PDF: dirty form saves before downloading.

The mock handlers are not tested on their own; they are exercised through seam 2, and every
response they produce passes the `shared` schemas inside the API client, which is what keeps them
aligned with the contract.

## Out of Scope

- The backend: API, worker, database, the agents, fact verification, PDF rendering and PDF text
  extraction — the next spec.
- Whole-stack Docker verification with the real API.
- A PDF generated in the browser; real text extraction in mock mode.
- Any imitation of the LLM in mocks (drafts are fixtures).
- Regenerating an existing CV; facts shared across CVs or users.
- Block types beyond the eight; multiple PDF templates; drag-and-drop reordering.
- Everything the task spec excludes: OAuth, password reset, email verification, payments, admin.

## Further Notes

- Accepting a pasted vacancy as role context touches the task's "tailoring to a job description is
  out of scope" line. The boundary: the vacancy is used as context for focus, ordering and
  requirements; it is never a source of facts, and skills it mentions reach the CV only through a
  question the user answers. The README must state this.
- Eight blocks instead of five is a deliberate scope increase of roughly 1–1.5 hours across the
  stack; if time runs short, Certifications and Projects are the first blocks to drop back into
  Skills and Experience.
- New vocabulary is in the glossaries: Role context, Fact, Draft (domain); Mock mode (frontend).
