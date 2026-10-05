# 07: Draft editor with Save and version conflict

**Package:** frontend

**Blocked by:** 05

**Status:** moved

**Moved to:** `frontend/.scratch/spa/issues/07-draft-editor.md`

**Spec:** [../spec.md](../spec.md)

**What to build:** On a CV that has a draft, the user edits every field of all eight blocks, adds, removes and
reorders items, renames the CV and saves. Saving from a stale tab produces a conflict notice
instead of overwriting newer work.

- [ ] Has-draft CV page: header (title, target role, status pill) and the editor; two columns from 980 px, below it a segmented control switching panels (later tickets add Questions and Preview to it)
- [ ] Editor covers contacts, summary, experience, projects, education, certifications, skills, languages; items can be added, removed, moved up / down; bullets are edited one per line; skills as chips; new items get client-generated ids
- [ ] Required blocks and fields that are missing are marked "missing" using the rule from `shared`
- [ ] Sticky save bar appears only when the form is dirty, with Save and Cancel; on phones it stays above the system gesture area; typing does not re-render the whole page
- [ ] The CV title can be changed and saved without sending the draft
- [ ] Items with every field empty are dropped on save
- [ ] Mock mode PATCH: validates the body, checks the version, returns the CV with the next version; a stale version → `409 VERSION_CONFLICT`; PATCH in a no-draft status → `409 INVALID_STATE`
- [ ] On a version conflict the user sees a notice with "Reload latest"; the form is remounted with fresh values when the server version changes
- [ ] Leaving the page with unsaved changes asks for confirmation
- [ ] Tests: edit and save, cancel, add / remove / reorder an item, rename only, version conflict notice, empty item dropped
