# 01: `shared` package: CV status machine, draft schema, missing-blocks rule

**Package:** shared, docs

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Spec:** [../spec.md](../spec.md)

**What to build:** The contract package exists and both apps can import it. It holds the CV status machine, the
draft schema with eight blocks and a user-changeable block order, and the rule that says which
required blocks and fields of a draft are missing. The design docs describe the same thing.

- [ ] `shared` is a workspace package (Zod as the only runtime dependency, pure code, no I/O) that the Vite frontend and a future NestJS backend can both import; it has `typecheck`, `lint`, `build` and `test` scripts that the root scripts pick up
- [ ] Status machine: the six statuses, allowed transitions, `canTransition`, the groups `isInProgress` / `hasDraft`, generation stages — as in `docs/cv-statuses.md`
- [ ] Draft schema has eight blocks: contacts, summary, experience, projects, education, certifications, skills, languages, with the shapes and limits from the spec; every field may be empty
- [ ] Draft carries `sectionOrder`: the seven movable blocks (all but contacts), each exactly once; anything else is rejected. The default order is exported: summary, experience, projects, education, certifications, skills, languages
- [ ] Duplicate item ids inside a draft are rejected; item ids must be UUIDs
- [ ] One pure function reports what is missing in a draft: required blocks (contacts with full name and at least one of email / phone, summary, skills, experience) and required fields of existing items (experience title / company / period, education institution). Optional blocks are never reported
- [ ] A helper tells whether a block is empty (used by preview and PDF to skip it) and drops items whose every field is empty
- [ ] Unit tests cover: transitions allowed / forbidden, group membership, schema limits, `sectionOrder` validation, duplicate ids, the missing rule including the "no experience" case, empty-item dropping
- [ ] `docs/architecture.md` (§6.2 draft, §6.5 auto questions, §13 confirmed rows 1–5, 7, 8) and `docs/cv-statuses.md` are updated to match, together with their `docs/uk/` copies
- [ ] The frontend still typechecks, lints and builds

**Notes:** Vitest is the runner (architecture.md §4). Build tool: tsdown, ESM + CJS.
