# 15: Rename the `shared` package to `@cv/shared`

**Package:** shared, docs

**Blocked by:** None (can start immediately)

**Status:** done

**Spec:** [../spec.md](../spec.md)

**What to build:** The contract package gets a scoped name, so an import of the contract can't be
confused with the frontend's own `src/shared` layer (`frontend/CLAUDE.md` → *Structure*). Decided
in the frontend design grilling on 2026-10-05.

- [x] `shared/package.json` `name` is `@cv/shared`; the folder stays `shared/`
- [x] Every consumer depends on `"@cv/shared": "workspace:*"` and imports `from '@cv/shared'`; the lockfile is updated
- [x] Root `CLAUDE.md`, `shared/CLAUDE.md`, `frontend/CLAUDE.md`, `docs/architecture.md` and its `docs/uk/` copy call it "the `@cv/shared` package" wherever they mean the package
- [x] Root `typecheck`, `lint`, `build` and `test` pass for `shared` and `frontend`

**Notes:** Do it before the frontend first imports the package (ticket 03), while the rename is a
one-line change.
