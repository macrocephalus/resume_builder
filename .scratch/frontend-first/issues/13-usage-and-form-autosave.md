# 13: Usage limits and autosave of the New CV form

**Package:** frontend

**Blocked by:** 05

**Status:** moved

**Moved to:** `frontend/.scratch/spa/issues/13-usage-and-form-autosave.md`

**Spec:** [../spec.md](../spec.md)

**What to build:** Second layer. The New CV form shows how many generations are left this hour, and an unsent
form survives a reload.

- [ ] The form shows generations used / limit and when the window resets; submit is disabled with an explanation when the limit is reached or two CVs are in progress
- [ ] Mock mode serves the usage endpoint from its own counters
- [ ] The unsent form is kept in session storage and restored after a reload; it is cleared after a successful submit
- [ ] Tests: limit reached disables submit; form restored after reload
