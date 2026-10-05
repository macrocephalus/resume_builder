# 08: A4 preview and block order

**Package:** frontend

**Blocked by:** 07

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** The user sees a live A4 preview of the CV while typing and can change the order of blocks;
the preview follows that order and never shows an empty block or field.

- [ ] Preview panel renders an A4-proportioned sheet from the unsaved form values, updating slightly after typing so input stays responsive
- [ ] Headings come from the CV language's list in `shared`; blocks follow `sectionOrder`; contacts is always first
- [ ] Empty blocks, empty items and empty fields are not rendered — no stray headings, separators or `undefined`
- [ ] Blocks can be moved up / down in the editor; the order is saved with the draft and survives a reload
- [ ] On phones the preview is one of the panels behind the segmented control
- [ ] Tests: reorder blocks → preview order changes and persists after save; a draft with only a name shows no block headings
