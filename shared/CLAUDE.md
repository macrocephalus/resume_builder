# Shared

The contract between `frontend/` and `backend/` in code: Zod schemas of `docs/api.md`, the CV
status machine (`docs/cv-statuses.md`), `CvData`, `computeMatch`, `CV_LANGUAGES`. **Not scaffolded
yet**: planned files in `docs/architecture.md` §5. Built with tsdown (ESM + CJS); no runtime
dependencies except zod; pure code, no I/O.

## Ownership

`shared` belongs to the root integration layer, not to either app: it changes only through root
specs and tickets (`.scratch/` at the repo root), together with the design doc it implements.
After a change, typecheck both apps — a contract change must not leave either of them red.

## Committing

Follow the commit rules in the root `CLAUDE.md`; scope is `shared`.

## Agent skills

The root `CLAUDE.md` sections apply. Product-domain terms live in `shared/GLOSSARY.md`, decisions
about the contract in `shared/docs/adr/` (`GLOSSARY-MAP.md` at the root).
