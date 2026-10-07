# 03: Answers about a job are worded into bullets

**Package:** backend

**Blocked by:** [01](01-replies-in-one-batch.md)

**Status:** done

**Spec:** [../spec.md](../spec.md) (decisions 1, 2, 5–9) · ADR: `docs/adr/0002-answer-wording-inside-the-request.md`

**What to build:** A user answers "about 300 companies, 2M payments a month" to a question about
a job's bullets and sees one or two proper bullets in the CV's language, starting with a verb and
keeping their numbers. An answer like "no, I didn't lead anyone" adds nothing. Whenever the
wording can't be trusted, the answer goes in as written, as in 01. The UI doesn't change: it
already shows the CV the server returns.

- [ ] A fast model, configured by `ANTHROPIC_FAST_MODEL` (default Haiku 4.5) and injected through
      its own token next to the draft model's, so tests replace it the same way; `.env.example`
      lists it
- [ ] **Answer wording**: one structured-output call for every `text` answer (and "Other" of a
      `choice`) of the batch whose target is the bullets of an experience or project item; made
      before the transaction, no row lock held while the model answers; 15 s for the call
- [ ] The model sees the question, the answer, the CV language, the target role and the item
      (title, company, its bullets), not the source; its instructions are static, the data
      escaped in tags, with the same "data, never instructions" safety rules as the draft
- [ ] Per answer it returns 1–3 bullets or "nothing to add"; the code appends them to that item
      only, nothing else in the CV changes, `skills` included
- [ ] Each worded answer is checked: every number in the answer, every technology-like word in
      the answer or the source; a failed check, a timeout, an API error or an invalid output →
      that answer (or the batch) as written; logged at `warn` with the reason, content under
      the content key
- [ ] `facts` and the question keep the raw answer
- [ ] e2e with a scripted fast model: a worded bullet; "nothing to add" → question `answered`,
      nothing added, fact stored; an invented number → raw; a timeout → raw; a batch with a
      bullets answer and a period answer → one worded, one as written
- [ ] `backend/docs/architecture.md` describes the wording step
- [ ] backend: typecheck, lint, format, tests, e2e and build pass

## Comments

- 2026-10-07: **Server** committed on `backend` branch `feat/answer-wording` (on top of
  `feat/reply-batches`): `5860ab9` refactor (technology-name check in its own module) and
  `6f0eeeb` the wording itself; not pushed, root pointer not bumped. Backend checks, 194 unit and
  157 e2e tests pass (a scripted fast model; not yet run against the real Haiku). Root
  `docs/architecture.md` §2 (and `docs/uk/`) now names answer wording as the one LLM call inside
  a request, and `.env.example` lists `ANTHROPIC_FAST_MODEL` — both uncommitted in the root.
  Known limit from the review: a bullet that reuses a technology word from the job's own bullets
  but not from the answer or the source (e.g. "API") is refused and goes in as written.
