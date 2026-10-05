# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This is a **multi-context** repo: the root is the integration layer, `shared/`, `backend/` and
`frontend/` are subprojects with their own glossary and decisions.

## Before exploring, read these

- **`GLOSSARY-MAP.md`** at the repo root: it points at one `GLOSSARY.md` per context. Read each one relevant to the topic. The domain glossary (`shared/GLOSSARY.md`) is relevant to almost everything.
- **`docs/adr/`**: system-wide decisions. Also check `<subproject>/docs/adr/` for decisions scoped to the subproject you're working in.
- **`docs/architecture.md`, `docs/api.md`, `docs/cv-statuses.md`**: the design set and the contract between subprojects.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Where new entries go

- A term of the product domain (CV, Draft, Question, Match, statuses…): `shared/GLOSSARY.md`. Changing it is a contract change: root tracker.
- A term only one subproject uses (Job, Worker, Prompt / Query key, Save bar…): that subproject's `GLOSSARY.md`.
- A decision that affects more than one subproject or the contract: `docs/adr/`. Otherwise: `<subproject>/docs/adr/`.

## File structure

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                 ← system-wide decisions
├── shared/
│   ├── GLOSSARY.md           ← the product domain
│   └── docs/adr/
├── backend/
│   ├── GLOSSARY.md
│   └── docs/adr/
└── frontend/
    ├── GLOSSARY.md
    └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the glossary. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
