# 06: README describes worded answers

**Package:** docs

**Blocked by:** [02](02-replies-survive-a-reload.md), [04](04-summary-and-new-job-worded.md), [05](05-wording-budget.md)

**Status:** done

**Spec:** [../spec.md](../spec.md)

**What to build:** A reviewer reading the README learns how answers reach the CV as they do now:
applied together, worded by a fast model, checked, and inserted as written when that fails.

- [ ] The decision row that says an answer is written into the CV as given, the "No AnswerAgent"
      limitation and the "with more time" item are replaced by what was built, with a link to
      root ADR 0002
- [ ] The known limits mention what wording doesn't check (faithfulness of the phrasing beyond
      numbers and technology names) and the as-written fallback
- [ ] Nothing in the README still describes `…/answer` or `…/skip`

## Comments

- 2026-10-07: written in the root `README.md` working copy (branch `docs/readme-for-the-spec`),
  **not committed**: every passage this ticket replaces exists only in the uncommitted README
  rewrite on that branch, so these hunks can't be committed apart from it. Done: the decision row
  (one batch, one Haiku call, checked, as written on failure, link to ADR 0002); "No AnswerAgent",
  "No limit on answers" and the AnswerAgent "with more time" item replaced; a verification point
  on worded answers and the known limit (phrasing beyond numbers, technology names, titles and
  companies isn't checked); the 60-per-hour budget and the fail-safe under failures; the diagram
  and the api bullet (the api now makes the one wording call); a test-list item. No `…/answer` or
  `…/skip` left.
