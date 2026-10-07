# AI CV Builder: handoff

The root of the project, for whoever picks it up next (2026-10-06). Root `main` with this file,
backend `5d2724c`, frontend `704cdd6`. The root is the integration layer: product specs, the
contract between the two apps and the whole-stack Docker setup. Each app has its own handoff with
its inside, its decisions and its open items:

- `backend/.scratch/handoff.md`
- `frontend/.scratch/handoff.md`

The design is in `docs/architecture.md`, `docs/api.md`, `docs/cv-statuses.md` (Ukrainian copies
in `docs/uk/`); how to work is in `workflow.md` and `CLAUDE.md`.

## State

- Feature-complete against the task spec (`docs/discovery_requirements _elicitation/`). Every
  ticket is done: root `.scratch/frontend-first` (contract tickets; the UI ones moved to the
  frontend) and `.scratch/server-contract/01`, backend `server/issues/01–12`, frontend
  `spa/issues/01–13`.
- A whole-stack run (`docker compose up`, real frontend, real Claude) passed: sign-up, create from
  text and from PDF, generation in English and Ukrainian, questions of every kind, edit, PDF
  download, isolation between users, phone width. Every finding is fixed and pushed.
- Tests, all green: `shared` 158, backend 172 unit + 145 e2e, frontend 299.
- **Uncommitted in the apps:** `backend/` (its `docs/architecture.md` rewritten to the code as
  built, `spec.md` → done, its handoff; work there goes on) and `frontend/` (its handoff). Commit
  them in the app, then bump the pointers at the root.
- **README:** how to run, the tests and the map of documents are written. The sections the spec
  also asks for are missing (see *Open*).

## Product

Sign up → My CVs → New CV (target role, optional role note, CV language, background as text or a
PDF whose text the user reviews) → background generation → a draft plus questions about
everything missing or unconfirmed → answer or skip, edit any field, reorder blocks, live match
against the role → A4 PDF with selectable text. "Also fits: X" starts a CV for another role from
the same source. Works on a phone; a reload loses nothing.

## Architecture

```
browser ──/api, same origin, httpOnly cookie──▶ web (nginx: SPA + /api proxy)
                                                  │
                                                  ▼
                     api (NestJS, no LLM calls) ──▶ postgres (source of truth)
                               │ enqueue                 ▲
                               ▼                         │
                         redis (BullMQ only) ──▶ worker ──┴──▶ Anthropic API
```

- **Three repos, one pnpm workspace.** `backend/` and `frontend/` are git submodules; they never
  import each other and talk only over HTTP.
- **The contract belongs to the root** and changes only through a root ticket:
  - `docs/api.md`: the REST API;
  - `docs/cv-statuses.md`: the CV state machine;
  - `shared/` (`@cv/shared`): Zod schemas, `CV_TRANSITIONS`, `findMissing`, `applyAnswer`,
    `autoQuestionText`, `computeMatch`, `CV_LANGUAGES`;
  - `shared/GLOSSARY.md`.

  Both apps parse with the same schemas, so they can't drift apart silently.
- **Statuses:** `queued → generating → (retrying) → needs_input | ready`, or `failed` → Retry.
  `generating` has the stages `drafting → verifying → revising → saving`.
- **Polling, not push** (`docs/adr/0001`): the UI polls `GET /api/cvs/statuses` every 3 s only
  while a CV is in progress.

## Running it

| Command (root) | What runs | Open |
|---|---|---|
| `docker compose up` (`pnpm stack`, add `--build` after code changes) | all five services, production builds | http://localhost:8080 |
| `pnpm stack:backend` / `pnpm stack:frontend` | one app in Docker | API `:3000` / web `:8080` |
| `pnpm dev` | postgres + redis in Docker; api, worker and Vite on the host in watch mode | http://localhost:5173, Swagger `:3000/api/docs` |

- **Compose layout:** the root `compose.yaml` only includes `backend/compose.yaml` and
  `frontend/compose.yaml`. The whole-stack wiring lives in `compose.stack.env` (web proxies to
  `api:3000`) and `compose.stack.web.yaml` (web waits for a healthy api, so the first start never
  shows a 502).
- **`pnpm dev`** first stops the stack's web, api and worker, because they use the same ports and
  the same queue.
- **Secrets:** the only one is `ANTHROPIC_API_KEY` in the root `.env`. The JWT secret is generated
  on the first start and stored in Postgres. Host ports can be changed in `.env`.
- **Memory:** Docker Desktop on this machine has 3.4 GB. `systemd-oomd` once killed it during a
  build while VS Code and the tests were also running. Close extra windows before `--build`.

## Decisions that span both apps

From `docs/architecture.md` §13 and the root decision logs: `.scratch/frontend-first/decisions.md`
and `.scratch/backend/decisions.md` (Q1–Q11).

- **No invented facts.** Every claim needs an evidence quote from the source or must appear in
  the source or the user's answers. What fails the check is removed and becomes a question:
  `confirm`, `text`, `choice`, or one `multi` for the skills. Answers are kept as facts for
  every later generation.
- **The role note is context, never a source of facts.** Tailoring to a job description is out of
  scope in the spec.
- **Match is computed, not judged:** the model lists the role's requirements with keywords, and
  `computeMatch` decides coverage in the browser on every edit.
- **An answer goes into the CV as written** through the shared, pure `applyAnswer`, without a
  model call. An AnswerAgent was cut for time and goes into the README under "with more time".
- **The draft:** eight blocks (the spec's five plus projects, certifications, languages). Every
  field may be empty; the required ones come from `findMissing`.
- **CV language:** chosen at creation, six languages. Only Latin, Cyrillic and Greek scripts work,
  because of the PDF font. The UI itself is English.
- **Explicit Save** with an optimistic `version` (`409 VERSION_CONFLICT`). PDF in: text layer
  only, nothing stored. PDF out: drawn on the server from the saved draft.
- **Limits:** 10 generations per user per sliding hour (a create or a Retry), 4 in progress per
  user, ingest 20/min, login 30/min per IP. `GET /api/usage` shows them. There is no answer limit
  (Q8).
- **Work flow (Q11):** with the contract done, work that stays inside one app starts in that app,
  without a root spec.

## Backend and frontend in one paragraph each

**Backend:** NestJS 11, Drizzle on Postgres 17, BullMQ on Redis 7, AI SDK v7 with
`claude-sonnet-5-5`. Two processes from one image: api (runs the migrations) and worker
(concurrency 8). Generation is one tool loop with a verifier, with retries and queue recovery.
→ `backend/.scratch/handoff.md`.

**Frontend:** Vite, React 19 with React Compiler, React Router 8, TanStack Query 5, RHF + Zod,
Tailwind v4. Layers `app → features → entities → shared`. Mock mode (`pnpm dev:mock`) plays the
whole API in the browser and also drives the tests.
→ `frontend/.scratch/handoff.md`.

## How to work here

- Open the session in the folder that owns the change (`workflow.md`). Contract changes start
  here: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement`.
- Commits follow `CLAUDE.md` → *Git & commits*:
  - Conventional Commits, one branch per task, never red;
  - commit and push the submodule first, then the root with the new pointer
    (`chore: bump backend`).
- When an English design doc changes, update its `docs/uk/` copy in the same commit.

## Open (root-owned)

- **README, the rest of the deliverable:** the architecture and main decisions, how the AI is
  kept from inventing facts, what was simplified and what would change with more time, and how AI
  tools were used. The last one only the author can write. The known simplifications are: the JWT
  can't be revoked, signup reveals a taken email, no answer limit, pdf.js runs on the api's event
  loop, translation faithfulness is trusted to the model. "With more time" is mainly the
  AnswerAgent.
- **`sectionOrder`:** the model picks the block order and the backend saves it. But
  `docs/architecture.md` §6.2 and the comment on `DEFAULT_SECTION_ORDER` in
  `shared/src/cv-data.ts` say a new draft always gets the fixed default. Decide which is right and
  fix the doc and the comment (both belong to the root).
- **Manual whole-stack checks** the run did not cover:
  - a wrong API key failing a CV at once;
  - the usage line and the limit notice;
  - the "Also fits" chip;
  - logout and reload;
  - delete;
  - a `confirm` question and the verification counts.
- Small items inside each app are listed under *Open* in its own handoff.
