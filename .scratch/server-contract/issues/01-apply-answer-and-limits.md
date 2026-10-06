# 01: Contract for the server: shared `applyAnswer`, no answer limit, jobs vs attempts

**Package:** shared, docs, frontend

**Blocked by:** None (can start immediately)

**Status:** done

**Spec:** [../spec.md](../spec.md) · backend spec: `backend/.scratch/server/spec.md`

**What to build:** A user who answers a question about their skills or their experience sees the
answer land in the CV instead of vanishing into `facts`. Both apps apply an answer with the same
shared function, so the server and the mocks cannot drift. The usage panel no longer promises an
answer limit the server doesn't enforce, and the status doc describes the job and attempt tables
the backend actually has.

- [x] `applyAnswer(data, question, answer)` lives in `@cv/shared` as a pure function with unit tests, with the rules of root `docs/architecture.md` §6.5: scalar targets written directly; `summary` and bullet targets appended as a sentence / bullet; `confirm` yes adds the claim to its target, no adds nothing; `multi` appends ticked options plus the comma-separated "other", without duplicates (case-insensitive)
- [x] A `text` answer whose target is the whole `skills` block (no item, no field) is split on commas, semicolons and line breaks, trimmed, and each part appended as its own skill without duplicates and without the label prefix; `"{label}: {value}"` stays only for a `choice` that targets `skills`
- [x] The answer to the question targeting the whole `experience` block creates one new experience item with a fresh UUID: each non-empty line of the answer is a bullet; title, company and period stay empty
- [x] The `experience` auto-question text in all six CV languages asks for the most recent job, one point per line, and says the title, company and dates go in the editor; its label is unchanged
- [x] `usageResponseSchema` has no `answers` counter; `api.md` drops the `429 RATE_LIMITED` line from the answer endpoint and the `answers` field from `GET /api/usage`; the frontend compiles (it never read `answers`)
- [x] `docs/cv-statuses.md` §4 ("Recovery on worker start") and §5 ("Generation attempt") describe one `generation_jobs` row per started generation (jobId = its id) and one `generation_attempts` row per attempt, with recovery on start and every 60 s; `docs/uk/cv-statuses.md` and `docs/uk/api.md` match
- [x] Root `docs/architecture.md` §6.5 states the two block-level rules and that `applyAnswer` is shared; `docs/uk/architecture.md` matches
- [x] The frontend mocks import `applyAnswer` from `@cv/shared` and delete their own copy; the mock no longer mentions the AnswerAgent
- [x] `shared` and `frontend`: typecheck, lint, tests and build pass
