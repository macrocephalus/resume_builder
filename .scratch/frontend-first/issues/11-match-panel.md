# 11: Match panel

**Package:** frontend

**Blocked by:** 08

**Status:** moved

**Moved to:** `frontend/.scratch/spa/issues/11-match-panel.md`

**Spec:** [../spec.md](../spec.md)

**What to build:** Second layer. The user sees how many of the role's requirements the CV covers, which ones
and where, and the result updates as they type or answer.

- [ ] CV header shows "Covers N of M requirements"; the list shows the same figure
- [ ] Match panel lists covered requirements with where they were found and missing ones; missing `experience` requirements say "Add it in the editor if it's true" — nothing is inserted automatically
- [ ] Match is computed in the browser with `computeMatch` from deferred form values: no request, no LLM
- [ ] The mock fixture includes requirements
- [ ] Tests: typing a missing keyword into a bullet turns its requirement covered
