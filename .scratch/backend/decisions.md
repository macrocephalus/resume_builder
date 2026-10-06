# Server side: decisions log

Grilling "server side: generation, questions, PDF, auth" (root session, 2026-10-05). One entry per
answered question; open questions stay out of this file until the user answers them.

## Process

- **Q1** The backend owns its design like the frontend does. Its internals move from the root
  `docs/architecture.md` into `backend/docs/architecture.md` (tree, tables, DraftAgent,
  verification, failure handling, auth internals, PDF rendering, test priorities); the "why"
  paragraphs become ADRs in `backend/docs/adr/` (queue, one status, tool loop, evidence quotes,
  pdfkit, JWT cookie) and `docs/adr/0001` (polling, spans both apps); backend terms start
  `backend/GLOSSARY.md` (Generation job, Attempt, Evidence). Work flow: the root spec says what
  the user gets and what changes in the contract; a session in `backend/` grills the internals,
  writes `backend/.scratch/<feature>/spec.md` (`Sources:`) and tickets (`Implements:`); the root
  tickets become `moved`.
- Questions about backend internals (JWT secret, fake model at runtime, e2e infrastructure) go to
  that backend grilling, not to the root.
- **Q11** (2026-10-06) No root spec or root tickets for the server: the contract is done and the
  frontend already works against it, so a root spec would repeat `api.md`. A session in `backend/`
  grills the internals and writes `backend/.scratch/server/spec.md` with `Sources:` naming
  `docs/api.md`, `docs/cv-statuses.md`, `@cv/shared`, this log and the frontend mocks
  (`frontend/src/mocks`) as the picture of how the server behaves. A contract gap found there comes
  back as a root ticket. `workflow.md` §1 has the rule.

## Scope and contract

- **Q2** The AnswerAgent is cut now: an answer goes into the CV as written; the README lists the
  agent under "with more time". Suggested roles (`fromCvId`), `GET /api/usage` and requirements
  for the match stay — cheap on the server, and the frontend already expects them. Remaining time
  for the backend was not stated.
- **Q6** `roleNote` → `roleContext` everywhere in the backend: column `role_context`, prompt tag
  `<role_context>`, limit 5 000. The root docs are renamed now; the backend document is renamed in
  the backend grilling, together with its spec.
- **Q7** Ticket 02 already brought the `Requirement` schema and the eight-block `QuestionTarget`
  in `api.md`. The missing piece — auto-question texts per CV language — is root ticket 17.
- **Q8** A generation, for the hourly limit and `GET /api/usage`, is what the user started:
  creating a CV or a manual Retry. Automatic retries of a failed attempt don't count.
- **Q9** Product terms **Claim** (a statement about the person in a draft; rests on the source or a
  fact) and **Requirement** (what the role needs; drives the match) go into `shared/GLOSSARY.md`;
  **Evidence** is a backend term. Root §6.6 and backend §4 use these words.
- **Q10** A `sourceText` over 20 000 chars gets `400 VALIDATION_ERROR` from the shared schema, with
  the field in `details.fields`; `413 INPUT_TOO_LARGE` is left to the PDF limits (5 MB, 10 pages).

## Checked against the frontend (2026-10-06)

The frontend is done on MSW mocks (`frontend/src/mocks`); every endpoint, field and status code it
uses matches `api.md`, and the mocks already follow Q2 (answer as written) and Q8 (what counts as a
generation). The mocks are a working picture of the server, but they leave out what the server
must still do:

- the answer limit (60 an hour, `429 RATE_LIMITED`);
- the PDF checks: ≤ 10 pages (`413`) and 20 uploads a minute (`429`); the mock fakes `422` by file
  name;
- `retrying` when the AI service is down: the mock's failure goes from `generating` straight to
  `failed`, the server retries first and fails only when the attempts run out.

Frontend-only gaps (its own tracker, not the root): usage is not refreshed after a manual retry
or an answer; a manual retry shows no `Retry-After` on `429`; `mocks/answers.ts` still names the
AnswerAgent.
