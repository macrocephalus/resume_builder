# 04: My CVs list

**Package:** frontend

**Blocked by:** 03

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** A signed-in user sees the list of their own CVs with status, open-question count and last
update, an empty state when there are none, and can delete a CV. Mock mode gets its CV store.

- [ ] Mock mode stores CVs per user in browser storage and seeds nothing for a new account; another user's CV is invisible (`404`)
- [ ] List rows show title, target role, status pill (label and colour mapped from the status string), open-question count, match when present, last update in the device locale
- [ ] Empty state explains what is needed to start and links to New CV
- [ ] Delete works in any status with an inline two-step confirmation
- [ ] Row actions depend on the status group: open, watch progress, retry, delete
- [ ] Loading, error (with retry) and empty states are handled
- [ ] Rows stack on narrow screens
- [ ] Tests: empty state, rows for CVs in different statuses, delete with confirmation
