# 05: A budget for worded answers

**Package:** backend

**Blocked by:** [03](03-bullet-answers-worded.md)

**Status:** done

**Spec:** [../spec.md](../spec.md) (decision 10)

**What to build:** One user can't burn model tokens by answering endlessly: past 60 worded answers
in a rolling hour their answers go in as written, and they are never refused for it.

- [ ] Worded answers are counted per user over a rolling hour, shared by every api instance
- [ ] An answer past the budget skips the model and goes in as written; the request still
      succeeds; logged at `info` once per batch
- [ ] The budget is a named limit with the other limits, not a literal
- [ ] Not shown in `GET /api/usage`; no `429` for it
- [ ] e2e: with the budget set low, the first answers are worded and the next go in as written
- [ ] backend: typecheck, lint, format, tests, e2e and build pass

## Comments

- 2026-10-07: **Server** committed on `backend` branch `feat/answer-wording` as `604c732`
  (refactor: the user lock and the sliding window shared by both limits) and `b131248` (the
  budget); not pushed. Each wording call writes a row to a new `answer_wordings` table (migration
  `0002`) with how many answers it sent; `WordingBudgetService.take` sums the window under the
  user's row lock before the call, so api instances share it and concurrent batches can't overrun
  it. An answer counts once sent to the model, whether or not its result is used (a cost guard);
  needs the user's confirmation, since decision 10 says "worded answers". The first answers of a
  batch up to the grant are worded, the rest go in as written; a budget that can't be counted
  falls back to as written too (`warn`). The rows are never pruned, like `generation_jobs`.
  Checked in a clean worktree of `b131248`: typecheck, lint, format, 202 unit and 162 e2e tests
  pass; build passed on the working tree.
- 2026-10-07: the user confirmed counting an answer once it is sent; spec decision 10 and root
  `docs/architecture.md` §6.5 (and its `uk` copy) say so.
