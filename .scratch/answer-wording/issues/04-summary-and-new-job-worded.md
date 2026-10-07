# 04: Answers to the summary and to a missing job are worded

**Package:** backend

**Blocked by:** [03](03-bullet-answers-worded.md)

**Status:** done

**Spec:** [../spec.md](../spec.md) (decisions 4, 8)

**What to build:** An answer to a summary question ends up as one clean sentence at the end of
the summary, and an answer to "tell us about your most recent job" becomes a new job with
bullets — and with its title, company and dates when the user named them — instead of raw lines
with empty fields.

- [ ] Wording covers `text` answers whose target is the summary (→ one sentence, appended; the
      existing summary is context only and is never rewritten) or the whole experience block
      (→ one new job: bullets, and title / company / period when the answer states them)
- [ ] Checks: a new job's title and company appear in the answer, every number of its period
      too; the sentence and bullets follow 03's checks; anything failing → as written
- [ ] The new job goes in like today's answer to that question (a fresh item), only with what the
      model filled; other jobs are untouched
- [ ] e2e with a scripted fast model: a summary sentence; a new job with title, company, period
      and bullets; a title not in the answer → as written; a period with a made-up year → as
      written
- [ ] backend: typecheck, lint, format, tests, e2e and build pass

## Comments

- 2026-10-07: **Server** committed on `backend` branch `feat/answer-wording` as `50bf72a` (on
  top of ticket 03's `6f0eeeb`); not pushed. Backend checks, 202 unit and 161 e2e tests pass
  (scripted fast model). Beyond the ticket, from the review: a result is checked per answer
  against its kind's shape (≤ 3 bullets on an item, a sentence ≤ 300 chars, a new job with 1–6
  bullets), so one answer out of shape falls back alone instead of failing the batch; a title or
  a company must appear in the answer as whole words. The model is told to copy the title and the
  company untranslated, so an answer in another language than the CV keeps them in the user's
  language rather than falling back.
