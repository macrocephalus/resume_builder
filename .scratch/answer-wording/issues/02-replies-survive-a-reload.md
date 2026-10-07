# 02: Unsent replies survive a reload

**Package:** frontend

**Blocked by:** [01](01-replies-in-one-batch.md)

**Status:** moved

**Moved to:** `frontend/.scratch/answer-wording/issues/04-keep-replies-in-browser.md`
(spec: `frontend/.scratch/answer-wording/spec.md`, decisions 8, 9, 11)

**Spec:** [../spec.md](../spec.md) (decision 13)

**What to build:** A user who filled in several replies and reloads the page, or closes the tab
and comes back, finds the replies where they left them and can apply them.

- [ ] The cards' drafts and their replied / skipped state are stored in the browser per user and
      CV and restored when the CV opens
- [ ] On restore, replies whose question is no longer open are dropped
- [ ] The stored replies are removed after a successful apply and when the CV is deleted
- [ ] Every read and write tolerates blocked, full or broken storage: the panel still renders and
      works, only without restoring
- [ ] Another user on the same browser never sees them
- [ ] UI tests: reload restores two replies and a skip; a question closed meanwhile is dropped;
      broken storage still renders; apply clears them
- [ ] frontend: typecheck, lint, tests and build pass

## Comments

- 2026-10-07: taken over by the frontend ticket above; the storage module, the delete cleanup
  and the route wiring are drafted on the frontend branch `feat/apply-replies` (uncommitted),
  tests not yet written.
