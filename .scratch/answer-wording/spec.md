# Spec: replies applied together, answers worded into the CV

Status: ready-for-agent
Package: shared, backend, frontend, docs
Sources: grilling with the user, 2026-10-07 (the decisions below); replaces root
`docs/architecture.md` §13 row 5 ("AnswerAgent cut, answers inserted as written")

## Problem

An answer goes into the CV exactly as the user typed it. "about 300 companies, 2M transactions a
month" becomes a bullet that doesn't start with a verb, isn't in the CV's language and reads like
a chat message; "no, I didn't lead anyone" becomes a bullet too. Every answer is also its own
request, so nothing can see two answers about the same job together.

## What changes for the user

1. In the Questions panel the user fills in as many questions as they like. **Answer** and
   **Skip** on a card no longer send anything: they mark the card as replied (answer kept, can be
   changed or undone until it is applied).
2. A bar at the bottom of the panel says **"Apply N replies"**. One click sends every replied card
   in one request. Replies survive a page reload until they are applied.
3. While it runs (a few seconds), the panel shows "Updating your CV…". Then the CV shows the
   answers **worded** as CV text: a bullet that starts with a verb, in the CV's language, with the
   user's numbers; a sentence at the end of the summary; a new job with its title, company and
   dates when the answer gives them.
4. Only the part of the CV each question points at changes. Nothing else is rewritten.
5. If wording fails for any reason, the answers go in as written, as today. The user never loses
   an answer and never sees an error because of the model.

## Decisions

| # | Decision |
|---|---|
| 1 | **Answer wording**: one `generateText` call (AI SDK, structured output) with a fast model, not an agent. Model from `ANTHROPIC_FAST_MODEL`, default `claude-haiku-4-5`. |
| 2 | **Synchronous**, inside the replies request, with a hard timeout (15 s for the whole batch); any failure → that answer, or the whole batch, goes in as written. No new CV status, no job. ADR: root `docs/adr/0002`. |
| 3 | **Replies go in batches**: `POST /api/cvs/:id/replies`, 1–12 replies, each an answer or a skip; one wording call for every answer of the batch that needs it; one transaction. The per-question `…/answer` and `…/skip` endpoints are removed. |
| 4 | **What is worded** — only `text` answers (and the "Other" text of a `choice`) whose target is: the `bullets` of an experience or project item (→ 1–3 new bullets, appended); the `summary` (→ one sentence, appended); the whole `experience` block (→ one new job: bullets, and title / company / period when the answer states them). Everything else is applied by `applyAnswer` as today. |
| 5 | **Only the target changes.** The model returns text; the code writes it to the question's target. Technologies named in an answer are not added to `skills` (the fact is kept; the next generation picks them up). |
| 6 | **"Nothing to add."** When an answer gives nothing for the CV ("no", "I don't know", "didn't lead anyone"), the model says so, nothing is added; the question is still `answered` and the fact stored. |
| 7 | **Facts stay raw.** `facts` and `question.answer` keep what the user wrote; the worded text exists only in `data`. |
| 8 | **Checked like a claim.** Every number of the worded text must be in the answer; every technology-like word in the answer or the source; a title / company of a new job must appear in the answer, its period's numbers too. A worded answer that fails → that answer as written. |
| 9 | **What the model sees**: the question, the answer, the CV language, the target role, and the target's context (the item's title, company and bullets, or the summary). Not the source. |
| 10 | **Cost guard**: at most 60 worded answers per user per rolling hour, an answer counted once it is sent to the model, whether or not its result is used (confirmed by the user, 2026-10-07); past it, answers go in as written, the request is not refused. Not shown in `GET /api/usage`. |
| 11 | **The UI isn't told** whether an answer was worded: the response is the CV, as today. |
| 12 | **All or nothing**: an invalid reply, or a question that is no longer open, rejects the whole batch and applies nothing. |
| 13 | Replies not yet applied are kept in the browser per CV and user (`localStorage`), dropped once applied or once their question is no longer open. |

## Terms

**Answer wording** (root glossary): turning an answer into CV text in the CV's language; only the
question's target changes, and the fact stays as the user wrote it. "AnswerAgent" is retired.

**Reply** (API only, not a domain term): an answer or a skip of one question inside a
`POST …/replies` batch.

## Contract

`docs/api.md` "Questions" (and `docs/uk/api.md`), `docs/cv-statuses.md` §3 row, root
`docs/architecture.md` §6.5 / §6.7 / §12 / §13 (and `docs/uk/`), root `docs/adr/0002`.
The root `README.md` (the "answer is written as given" decision row, "No AnswerAgent" and
the "with more time" list) changes when the feature ships, not before: it describes what is built.

## Issues

Vertical slices, blockers first:

- [01 — replies in one batch, inserted as written](issues/01-replies-in-one-batch.md)
- [02 — unsent replies survive a reload](issues/02-replies-survive-a-reload.md) · blocked by 01
- [03 — answers about a job are worded into bullets](issues/03-bullet-answers-worded.md) · blocked by 01
- [04 — answers to the summary and to a missing job are worded](issues/04-summary-and-new-job-worded.md) · blocked by 03
- [05 — a budget for worded answers](issues/05-wording-budget.md) · blocked by 03
- [06 — README describes worded answers](issues/06-readme-after-release.md) · blocked by 02, 04, 05

## Out of scope

- Rewriting the whole summary around an answer (only a sentence is appended).
- Wording answers to scalar fields (period, level, degree, contacts) — inserted as written.
- Telling the user an answer was worded, or showing the raw answer next to the CV text.
- Re-generating the CV from its facts.
