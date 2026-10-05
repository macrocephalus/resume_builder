# AI CV Builder

## What the system does

A web app that turns a user's raw background into a clean, role-targeted CV:

1. The user signs up / logs in (email + password) and sees only their own CVs.
2. They upload a CV as a PDF or describe their experience in free text, and name a target role
   (e.g. "Senior Backend Engineer").
3. The backend generates a CV draft with Claude (contacts, summary, experience, education,
   skills): bullet-point descriptions, a role-targeted summary, most relevant experience first.
   Generation runs as a background job — the UI never freezes and a page reload loses nothing.
4. The AI may rephrase and restructure but **must not invent facts**. Anything missing or vague
   becomes a question to the user; the answer updates the matching part of the CV.
5. The user edits any field by hand and downloads an A4 PDF with selectable text.
6. CVs are stored server-side, available from any device; the UI works on a phone.

Runs locally with `docker compose up`; the only secret is `ANTHROPIC_API_KEY`.

## Task spec

This is a take-home test task with a **10-hour budget: cut features, never reliability**.
The full spec (requirements, constraints, out-of-scope list, deliverables, grading criteria) is in
`docs/discovery_requirements _elicitation/`:

- `Fullstack Engineer — Test Task AI CV Builder.pdf` — original (English)
- `Fullstack Engineer — Test Task AI CV Builder (EN).txt` — same text, plain English
- `Fullstack Engineer — Test Task AI CV Builder (UA).txt` — Ukrainian translation

Read the spec before making scope or architecture decisions.

## Layout

Three git repos, one pnpm workspace. The root is the **integration layer**: it owns the product
specs, the contract between subprojects and the whole-stack Docker setup. The subprojects are
independent: each has its own `CLAUDE.md`, dependencies, checks, Dockerfile, compose file,
glossary, ADRs and tracker, and runs on its own.

- `frontend/` — React SPA; conventions and commands in `frontend/CLAUDE.md`. Git submodule.
- `backend/` — NestJS + Drizzle + Vercel AI SDK v7 (Anthropic); `backend/CLAUDE.md`. Git submodule.
  Not scaffolded yet.
- `shared/` — the `@cv/shared` package: Zod schemas, CV status machine, `computeMatch`; the
  contract in code, imported by both apps; `shared/CLAUDE.md`.
- `docs/` — task spec and the design set (draft, under review with the user):
  - `docs/architecture.md` — product, flow, components, stack, the draft, questions, CV language,
    match, decisions; the inside of each subproject is in `backend/docs/architecture.md` and
    `frontend/docs/architecture.md`
  - `docs/adr/` — decisions that span the subprojects
  - `docs/api.md` — REST contract
  - `docs/cv-statuses.md` — CV state machine, allowed actions per status
- `workflow.md` (root, in Ukrainian) — **how to work**: which folder to open the session in, the
  skill flow (`/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement`), where specs and
  tickets go. Read it before starting a task.

### Ownership

- `frontend/` and `backend/` never import each other. They share code only through the
  `@cv/shared` package (`"@cv/shared": "workspace:*"`) and talk only over the HTTP API in `docs/api.md`.
- **The contract belongs to the root:** `docs/api.md`, `docs/cv-statuses.md`, `shared/` and the
  domain glossary (`shared/GLOSSARY.md`) change only through root specs and tickets. A subproject
  reads the contract and adapts to it.
- A user-facing feature is specced at the root and split into tickets per subproject, usually in
  the order `shared` → `backend` → `frontend`. Work inside one subproject's internals is specced
  and ticketed in that subproject.

## Docker

Every image is built with the repo root as context (it needs `shared/` and the root lockfile).

| Command (repo root) | Starts | `/api` from the web container goes to |
|---|---|---|
| `docker compose up --build` (`pnpm stack`) | web, api, worker, postgres, redis | the `api` service |
| `pnpm stack:backend` | api, worker, postgres, redis | — (API on `localhost:3000`) |
| `pnpm stack:frontend` | web on `localhost:8080` | backend on the host port 3000 |

- `compose.yaml` only `include`s `backend/compose.yaml` and `frontend/compose.yaml`; services are
  defined once, in the subproject that owns them. `compose.stack.env` holds the whole-stack wiring
  (`API_UPSTREAM=api:3000`).
- `.env` (from `.env.example`) lives at the root; a missing `ANTHROPIC_API_KEY` stops compose
  with a clear error.

`docs/uk/` holds Ukrainian translations of these three files for the user. English is the source
of truth; when an English design doc changes, update its `docs/uk/` copy in the same change.

Design docs are the source of truth for behavior: change the doc and the code together, and don't
mark a doc decision as final without the user's confirmation.

## Environment

Node is managed by nvm and is not on PATH in non-interactive shells. Prefix commands with:

```sh
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && <command>
```

Package manager: pnpm (via corepack).

## Git & commits

The commit history is part of what reviewers grade — every commit must be readable on its own.

### Repositories

| Path | Remote |
|---|---|
| root (`shared/`, `docs/`, compose, specs) | `git@github.com:macrocephalus/resume_builder.git` |
| `backend/` (submodule) | `git@github.com:macrocephalus/resume_builder_backend.git` |
| `frontend/` (submodule) | `git@github.com:macrocephalus/resume_builder_frontend.git` |

- Clone: `git clone --recurse-submodules git@github.com:macrocephalus/resume_builder.git`.
- Update all three to the latest `main`: `pnpm pull` (root `git pull --ff-only`, then
  `git pull --ff-only` on `main` in each submodule).
- Each submodule has its own branches and commits; the branch flow below applies inside it.
  The root records which submodule commit it uses: after a submodule's `main` moves, commit the
  new pointer in the root (`git add backend` → `chore: bump backend`) so a fresh clone gets it.
- A change spanning the contract and a subproject = one commit in the submodule, then one in the
  root that updates the contract and the pointer. Push the submodule before the root.

### Hard rules

- Commit **only when the user asks**. Never push, force-push, `--amend` or rebase pushed commits
  without an explicit request.
- **Never commit to `main` directly** — always a branch (see *Branch flow*).
- **Never commit red code.** Typecheck, lint and tests of every touched package must pass.
- **Never commit secrets or generated files:** `.env`, `node_modules/`, `dist/`, coverage.
  `ANTHROPIC_API_KEY` lives only in `.env`; commit `.env.example` instead.

### Branch flow

Trunk-based flow with short-lived feature branches (no `develop`/`release` branches — there are
no releases, just one deliverable).

```
main ──●────────────●──────────●──      always green, linear history
        \          /          /
         ●──●──●──●  feat/…  ●──●  fix/…
```

- `main` — the only long-lived branch. Always builds and passes tests. Only the very first
  bootstrap commit goes to `main` directly.
- Branch per task: `<type>/<short-desc>`, kebab-case, same types as commits —
  `feat/auth`, `feat/cv-generation`, `fix/pdf-fonts`, `docs/readme`, `build/docker-compose`.
- One branch = one feature / fix. Keep it small (hours, not days).

Lifecycle of a branch:

1. **Start** from an up-to-date `main`: `pnpm pull` from the root (all three repos), then in
   the repo you work in (root or a submodule) `git switch -c feat/<short-desc>`.
2. **Work** in atomic commits (see *Commit procedure* below).
3. **Sync** with `main` by rebasing, never by merging `main` into the branch:
   `git fetch && git rebase origin/main` (or `git rebase main` locally). Fix conflicts, re-run checks.
4. **Finish:**
   - local only: `git switch main && git merge --ff-only <branch>`
   - with GitHub remote: `git push -u origin <branch>`, open a PR, merge with
     **"Rebase and merge"** (no merge commits, no squash — individual commits are kept for review).
5. **Clean up:** `git branch -d <branch>` (and delete the remote branch after merge).

Pushing, opening PRs and merging into `main` happen only when the user asks.

### Message format (Conventional Commits)

```
<type>(<scope>): <subject>

<body — optional: why the change was made, wrapped at 72>

Co-Authored-By: Claude <noreply@anthropic.com>   ← only when Claude wrote the change
```

| type       | when                                              |
|------------|---------------------------------------------------|
| `feat`     | new user-visible behavior                         |
| `fix`      | bug fix                                           |
| `refactor` | code change without behavior change               |
| `test`     | adding/fixing tests only                          |
| `docs`     | README, CLAUDE.md, docs/                          |
| `build`    | dependencies, Docker, tooling config              |
| `chore`    | anything else that doesn't touch app behavior     |

- **scope:** `frontend`, `backend`, `shared`, `docs`, `infra`; omit if the change spans the repo.
- **subject:** English, imperative mood ("add", not "added"), lowercase, no trailing period,
  ≤ 72 chars, says *what* changed.
- Good: `feat(backend): persist generation jobs so reloads resume progress`
- Bad: `update`, `fix stuff`, `WIP`, `Added cv editor and fixed bugs`

### What goes into one commit

- **One logical change per commit.** If the subject needs "and", split it.
- Code and its tests go in the **same** commit.
- Don't mix formatting/refactoring with behavior changes — separate commits.
- Each commit must build and pass on its own.

### Commit procedure

1. `git status` and `git diff` — review every change; nothing unrelated, no debug leftovers.
2. Run checks for each touched package (see its `CLAUDE.md`), e.g. in `frontend/`:
   `pnpm typecheck && pnpm lint && pnpm build`.
3. Stage explicitly: `git add <paths>` (never `git add -A` / `git add .`).
4. `git diff --staged` — confirm the staged set is exactly one logical change.
5. Commit with a heredoc so the message keeps its formatting:
   ```sh
   git commit -F - <<'EOF'
   feat(frontend): add cv list page

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   ```
6. `git log --oneline -5` — check the result.

## Agent skills

### Issue tracker

Local markdown in `.scratch/`: root tracker for contract changes and cross-subproject features,
`backend/.scratch/` and `frontend/.scratch/` for subproject internals. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `GLOSSARY-MAP.md` points to `shared/` (domain), `backend/` and `frontend/` glossaries;
system-wide ADRs in `docs/adr/`. See `docs/agents/domain.md`.
