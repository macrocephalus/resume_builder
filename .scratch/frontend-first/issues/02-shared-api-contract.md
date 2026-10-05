# 02: `shared` package: REST schemas, questions, CV languages, match

**Package:** shared, docs

**Blocked by:** 01

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** Every request and response of the REST contract exists as a Zod schema in `shared`, together
with question and answer schemas, the CV language list and the match computation. `docs/api.md`
reflects the decisions of the spec.

- [ ] Schemas for every endpoint in `docs/api.md`: auth, usage, PDF ingest, CV create / list / statuses / detail / patch / retry, answer, skip; plus the error envelope and the list of error codes
- [ ] `roleNote` is renamed `roleContext` everywhere, limit 5 000 chars
- [ ] PATCH body: `version`, optional `title`, optional draft; a body with neither `title` nor draft is invalid
- [ ] Question schema: four kinds, origin, label, options, claim, status, answer; the target section covers all eight blocks, item-level targets for experience, projects, education, certifications, languages
- [ ] Answer schemas per question kind (text, choice with other, multi with other, confirm)
- [ ] CV language allow-list (en, uk, pl, de, fr, es): code, English name, native name, headings for all eight blocks
- [ ] `computeMatch(draft, requirements)`: a requirement is covered when any keyword occurs (normalised, word boundary) in the summary, titles, bullets of experience and projects, or skills; returns covered / total and per-requirement result with where it was found
- [ ] Unit tests: `computeMatch` (normalisation, word boundaries, covered / not covered, found-in), answer schemas per kind, PATCH body rule, create body rule (`sourceText` or `fromCvId`)
- [ ] `docs/api.md` updated: eight-block `CvData` with `sectionOrder`, `roleContext`, partial PATCH, client-generated item ids, empty items dropped, PATCH skips questions of removed items and may turn the CV `ready`, answer to a question whose target is gone → `409 INVALID_STATE`; `docs/uk/api.md` updated in the same change
- [ ] The frontend still typechecks, lints and builds
