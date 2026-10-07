# Answers are worded by one fast-model call inside the replies request

A free-text answer to bullets, the summary or the experience block is turned into CV text by one
`generateText` call with a fast model (Haiku 4.5), made inside `POST /api/cvs/:id/replies` before
its transaction, with a 15 s limit for the whole batch; whatever fails, times out or isn't backed
by the answer goes in as written. This breaks the backend rule that long work belongs to the
worker, on purpose: a fast model answers in seconds, and doing it in the request needs no new CV
status, no job, no polling and no rule for edits made while an answer is being worded — the user
waits a few seconds once per batch, and a model failure costs them nothing.

## Considered Options

- **Insert answers as written** (the cut AnswerAgent) — no model, but chat-like text in the CV,
  in the wrong language, and "no" answers become bullets.
- **Word answers in the worker** — no long request, but a new "applying answers" state on the CV
  and in the UI, polling, and a rule for manual edits saved while the job runs.
- **An agent with a tool loop** — the task is one small rewrite with nothing to look up; a single
  structured call is enough, and the code checks the result the way the verifier checks a claim.
- **Regenerate the whole CV from its facts** — the model weaves every answer in, but manual edits
  are lost and every answer costs a full generation.

## Consequences

- Replies are sent in batches, so one call words every answer of the batch and sees them
  together; the per-question answer and skip endpoints are gone.
- The request can take up to ~15 s; the UI shows progress and doesn't time out before 30 s.
- A per-user budget of worded answers caps the cost; past it, answers go in as written.
