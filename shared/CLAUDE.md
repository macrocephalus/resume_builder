# Shared

The `@cv/shared` package: the contract between `frontend/` and `backend/` in code. The folder is
`shared/`; the apps depend on `"@cv/shared": "workspace:*"` and import `from '@cv/shared'`. It
holds the CV status machine (`docs/cv-statuses.md`), the draft schema `CvData` and the rule for
what a draft is missing (`docs/architecture.md` §6.2). Still to come (planned files in
`docs/architecture.md` §5): Zod schemas of `docs/api.md`, `computeMatch`, `CV_LANGUAGES`. No
runtime dependencies except zod; pure code, no I/O.

## Commands

- `pnpm test` — Vitest, once
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — oxlint
- `pnpm build` — tsdown → `dist/` (ESM for the frontend, CJS for the backend, with types)

Dependencies are installed from the repo root (`pnpm install`): one workspace, one lockfile.
The apps import the built package (`dist/`), so build `@cv/shared` before typechecking an app that
uses it — `pnpm build` from the root does it in dependency order.

## Structure

`src/index.ts` is the only entry: everything the apps may use is exported from it. One file per
concept, its test next to it (`*.test.ts`); `src/testing/` holds draft fixtures for tests and is
not exported.

## Rules

- Tests go through `src/index.ts`, the same surface the apps see.
- A schema describes what may be stored; what a CV *should* have is a separate pure function
  (`findMissing`) — don't make fields required in the schema, the model must be able to leave
  them empty.

## Ownership

The `@cv/shared` package belongs to the root integration layer, not to either app: it changes only through root
specs and tickets (`.scratch/` at the repo root), together with the design doc it implements.
After a change, typecheck both apps — a contract change must not leave either of them red.

## Committing

Follow the commit rules in the root `CLAUDE.md`; scope is `shared`.

## Agent skills

The root `CLAUDE.md` sections apply. Product-domain terms live in `shared/GLOSSARY.md`, decisions
about the contract in `shared/docs/adr/` (`GLOSSARY-MAP.md` at the root).
