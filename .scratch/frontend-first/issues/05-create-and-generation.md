# 05: Create a CV from text and watch generation

**Package:** frontend

**Blocked by:** 04

**Status:** moved

**Moved to:** `frontend/.scratch/spa/issues/05-create-from-text-and-generation.md`

**Spec:** [../spec.md](../spec.md)

**What to build:** A user names a target role, optionally adds role context, picks the CV language, pastes their
background and submits. They land on the CV page and watch it move through the statuses without
reloading; a reload or a second tab loses nothing. A failed CV can be retried. After this ticket
the flow runs from sign-up to a generated draft (shown as a placeholder until the editor exists).

- [ ] New CV form: target role (required), role context (optional, 5 000 chars), CV language select with native names (default English), background text area with a counter and the limits; validation from the `shared` schema
- [ ] Submit is disabled while pending; on success the user lands on the CV page
- [ ] Mock mode fake worker advances a CV by elapsed time: `queued` (with queue position) → `generating` with stages → result; it keeps progressing across reloads
- [ ] Scenario by keyword in the target role: `fail` → `failed`; `retry` → `retrying` then success; `ready` → success without questions; otherwise `needs_input`. The draft and questions come from one fixture with all eight blocks and questions of all four kinds
- [ ] Mock mode enforces two CVs in progress (`429 TOO_MANY_ACTIVE`) and the hourly limit (`429 RATE_LIMITED` with retry-after); the form shows a readable message
- [ ] CV page by status group: in progress — status pill, stage text / "N ahead of you" / "attempt 2 of 3", a note that the page can be closed, announced politely to screen readers; failed — error text, Retry, Delete
- [ ] Polling: the lightweight statuses endpoint every 3 s only while a CV is in progress, on the CV page and on the list; when a CV leaves that group its detail and the list are refreshed. The full CV is never polled
- [ ] Retry from `failed` re-queues the CV; delete works during generation
- [ ] Tests: create → progress → draft appears without reload; each of the six statuses shows the right card and actions; limit error on submit; retry
