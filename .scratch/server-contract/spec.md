# Spec: contract changes the server needs

Status: ready-for-agent
Package: shared, docs, frontend
Sources: `backend/.scratch/server/spec.md` (§ "Contract dependencies"), `backend/.scratch/server/decisions.md` (Q8, Q10, Q13–Q15)

The server grilling (2026-10-06) found four things in root-owned files that the backend cannot
change itself. They are gathered in one ticket so the backend's answer/skip and usage tickets have
a single blocker. The *why* is in the backend decisions log; this file only names the changes.

1. `applyAnswer` is part of the contract (root `docs/architecture.md` §6.5) but exists only as a
   frontend mock; the server would be a second copy. It moves into `@cv/shared`, and two
   block-level answers that had nowhere to go get rules: a `text` answer to the whole `skills`
   block, and the answer to the `experience` block question.
2. The experience auto-question text asks for every job at once; with no AnswerAgent the answer
   has to fit one new job entry, so the text changes in all six languages.
3. The hourly answer limit guarded the AnswerAgent's model call; the agent is cut, so the limit
   goes: out of `Usage`, out of `api.md`.
4. `docs/cv-statuses.md` §4/§5 say one `generation_jobs` row per attempt and `jobId` = job row id;
   the backend keeps one job per started generation and one `generation_attempts` row per attempt.

Issues: [issues/](issues/).
