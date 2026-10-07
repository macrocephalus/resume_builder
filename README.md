# AI CV Builder

A web app that turns a raw background (a PDF or a few paragraphs of free text) into a clean CV for
a target role. Claude writes the draft in a background job. Anything the source does not support
becomes a question to the user instead of an invented fact. The user answers, edits any field and
downloads an A4 PDF.

## Run it

You need **Docker** (with Compose v2) and an **Anthropic API key**. Nothing else is installed on
the host.

```sh
git clone --recurse-submodules git@github.com:macrocephalus/resume_builder.git
cd resume_builder
cp .env.example .env          # then set ANTHROPIC_API_KEY=sk-ant-… in .env
docker compose up --build     # first start: builds the images, ~2–3 min
```

Open **http://localhost:8080**, sign up with any email and a password of 8+ characters, and create
a CV.

- **Background:** `docker compose up -d` runs it in the background;
  `docker compose logs -f api worker` shows the logs.
- **Stop:** `docker compose down`. Add `-v` to delete the database as well.
- **Later starts:** `docker compose up` without `--build` is enough until the code changes.
- **Secrets:** `ANTHROPIC_API_KEY` is the only one. The session-signing secret is generated on the
  first start and kept in the database. A missing key stops `docker compose` with a clear message.
- **Ports:** web `8080`, API `3000`, Postgres `55432`, Redis `56379`. All are published on
  `127.0.0.1` only. If one is taken, set `WEB_PORT`, `API_PORT`, `POSTGRES_PORT` or `REDIS_PORT`
  in `.env`.

What starts: `web` (nginx: the SPA and a proxy for `/api`), `api` (NestJS; runs the database
migrations), `worker` (the generation jobs), `postgres`, `redis`. The order is postgres and redis →
api → worker and web, so the page answers only once the API is ready.

Other ways to run:

| Command (repo root) | What runs |
|---|---|
| `pnpm stack:backend` | api, worker, Postgres, Redis; API on `localhost:3000` |
| `pnpm stack:frontend` | the web container alone, proxying to a backend on the host's port 3000 |
| `pnpm dev` | Postgres and Redis in Docker; api, worker and Vite on the host in watch mode |

## Run the tests

You need **Node 24** and **pnpm**: `corepack enable` provides the pnpm version pinned in
`package.json`.

```sh
pnpm install
pnpm --filter @cv/shared build   # the apps import shared's build output
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm test` runs all three packages: `shared` (schemas, status machine, `applyAnswer`,
`computeMatch`), the backend's unit tests and the frontend's tests.

- The frontend's tests render the whole app against MSW handlers, so they need no backend.
- The backend's end-to-end tests need the project's Postgres and Redis. They use their own
  database, `cv_test`, and their own queue, and replace Claude with a scripted model, so they need
  no API key:

  ```sh
  docker compose up -d postgres redis
  pnpm --filter backend test:e2e
  ```

## Develop

- **`pnpm dev`** (repo root) is the whole app in watch mode:
  - app on http://localhost:5173;
  - API on `localhost:3000`, Swagger UI at http://localhost:3000/api/docs;
  - debug logs that include the user's text.

  It stops the Docker stack's `web`, `api` and `worker` first, because they use the same ports and
  queue. After a change in `shared/`, restart it.
- **`pnpm --filter frontend dev:mock`** is the frontend alone, with the whole API simulated in the
  browser. It needs no Docker, backend or key.

## Documents

**Start here**

| Document | What it is |
|---|---|
| `docs/discovery_requirements _elicitation/` | The task spec: original PDF, plain English text, Ukrainian translation |
| `docs/architecture.md` | The design of the whole product: flow, components, the CV draft, questions, how facts are verified, CV language, match, limits, decisions |
| `docs/api.md` | The REST contract between the frontend and the backend: every endpoint, body, error code |
| `docs/cv-statuses.md` | The CV state machine: statuses, transitions, what the user can do in each |
| `docs/adr/` | Decisions that span both apps (`0001`: the UI polls statuses instead of a push channel) |
| `docs/uk/` | Ukrainian copies of the three design documents above |

**Each part's inside**

| Document | What it is |
|---|---|
| `backend/README.md` | Running the backend alone, its checks, and how logging works and is switched |
| `backend/docs/architecture.md` | Modules, tables, the generation agent, verification, failures and recovery, auth, logs |
| `backend/docs/adr/0001–0007` | The queue, one status per CV, the agent's tool loop, evidence quotes, pdfkit, JWT cookie, Swagger |
| `frontend/docs/architecture.md` | Layers, routes, data fetching, polling, the editor, mock mode, tests |
| `frontend/docs/design.md` | The look: tokens, type, components, the glass layer |
| `frontend/docs/adr/0001–0003` | Frosted glass on one layer, the four layers, mock mode outside the layers |
| `shared/` | The `@cv/shared` package: the contract in code (Zod schemas, status machine, `findMissing`, `applyAnswer`, `computeMatch`, CV languages) |

**Vocabulary, process and history**

| Document | What it is |
|---|---|
| `GLOSSARY-MAP.md` | Points to the glossaries: the domain one in `shared/GLOSSARY.md`, plus `backend/` and `frontend/` |
| `workflow.md` | How the work is organised (in Ukrainian): which folder a task starts in, spec → tickets → implementation |
| `CLAUDE.md` (root and each part) | Instructions for AI coding agents: conventions, checks, commit rules |
| `.scratch/` (root, `backend/`, `frontend/`) | The local tracker: specs, tickets, decision logs from the design interviews |
| `.scratch/handoff.md` | The state of the project for whoever picks it up; `backend/` and `frontend/` have their own |

## Repository layout

Three git repositories in one pnpm workspace:

- **The root** is the integration layer: `shared/`, `docs/`, the whole-stack Docker setup.
- **`backend/` and `frontend/`** are git submodules. They never import each other: they talk only
  over the HTTP API and share code only through `@cv/shared`.
