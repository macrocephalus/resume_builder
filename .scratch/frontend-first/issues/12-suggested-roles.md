# 12: "Also fits": a new CV from an existing one

**Package:** frontend

**Blocked by:** 05

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** Second layer. From a CV with a draft the user picks a suggested role and gets a new CV for
it, generated from the same source and facts, without re-entering anything.

- [ ] CV header shows up to three suggested-role chips
- [ ] A chip opens the New CV form prefilled with the role and the parent's language, with the background hidden and a note that the source of the parent CV is reused
- [ ] Submitting creates the CV with `fromCvId`; it counts toward the limits
- [ ] Mock mode supports `fromCvId`: copies source and facts, `404` for a foreign CV, `409 INVALID_STATE` when the parent has no draft
- [ ] Tests: chip → prefilled form → new CV in progress
