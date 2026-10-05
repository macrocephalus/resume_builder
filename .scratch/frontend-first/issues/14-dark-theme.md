# 14: Dark theme

**Package:** frontend

**Blocked by:** 03

**Status:** wontfix

**Spec:** [../spec.md](../spec.md)

**What to build:** Second layer. The app follows the device's light / dark preference.

- [ ] Every colour comes from a design token with a dark variant; no hard-coded colours in components
- [ ] The theme follows `prefers-color-scheme`
- [ ] Status pills, notices, focus rings and the save bar keep readable contrast in both themes
- [ ] The A4 preview sheet stays white with dark text in both themes, like the PDF

## Comments

2026-10-05 — wontfix: the UI is light only (pastel backdrop + frosted glass on the glass layer,
designed for a light theme). See `frontend/docs/design.md` and
`frontend/docs/adr/0001-own-css-glass-on-glass-layer-only.md`.
