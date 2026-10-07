# AI CV Builder

A web app that turns a raw background (a PDF or a few paragraphs of free text) into a clean CV for
a target role. Claude writes the draft in a background job. Anything the source does not support
becomes a question to the user instead of an invented fact. The user answers, edits any field and
downloads an A4 PDF.

> [!IMPORTANT]
> **Clone with `--recurse-submodules`.** `backend/` and `frontend/` are git submodules (separate
> repositories). A plain `git clone` leaves them empty and the build fails.
>
> ```sh
> git clone --recurse-submodules https://github.com/macrocephalus/resume_builder.git
> ```
>
> Already cloned without it? Run `git submodule update --init` in the repo root.
> HTTPS works without a GitHub SSH key: the submodule URLs are relative, so they follow the
> protocol of the root clone.

**Contents:**
- [Run it](#run-it)
- [Run the tests](#run-the-tests)
- [Architecture](#architecture)
- [Main decisions](#main-decisions)
- [Keeping the AI from inventing facts](#keeping-the-ai-from-inventing-facts)
- [Failures and untrusted input](#failures-and-untrusted-input)
- [What was simplified, and what more time would change](#what-was-simplified-and-what-more-time-would-change)
- [How AI tools were used](#how-ai-tools-were-used)
- [Documents](#documents)

The task's five README questions are answered in: [Run it](#run-it) and
[Run the tests](#run-the-tests); [Architecture](#architecture) and
[Main decisions](#main-decisions);
[Keeping the AI from inventing facts](#keeping-the-ai-from-inventing-facts);
[What was simplified](#what-was-simplified-and-what-more-time-would-change);
[How AI tools were used](#how-ai-tools-were-used).

## Run it

You need **Docker** (with Compose v2) and an **Anthropic API key**. Nothing else is installed on
the host.

```sh
git clone --recurse-submodules https://github.com/macrocephalus/resume_builder.git   # pulls backend/ and frontend/ too
cd resume_builder
cp .env.example .env          # then set ANTHROPIC_API_KEY=sk-ant-… in .env
docker compose up --build     # first start: builds the images, ~2–3 min
```

Open **http://localhost:8080**, sign up with any email and a password of 8+ characters, and create
a CV. A generation takes about 30–45 seconds.

- **Already cloned without submodules:** run `git submodule update --init` first.
- **Background:** `docker compose up -d` runs it in the background;
  `docker compose logs -f api worker` shows the logs.
- **Stop:** `docker compose down`. Add `-v` to delete the database as well.
- **Later starts:** `docker compose up` without `--build` is enough until the code changes.
- **Secrets:** `ANTHROPIC_API_KEY` is the only one. The session-signing secret is generated on the
  first start and kept in the database. A missing key stops `docker compose` with a clear message.
- **Ports:** web `8080`, API `3000`, Postgres `55432`, Redis `56379`. All are published on
  `127.0.0.1` only. If one is taken, set `WEB_PORT`, `API_PORT`, `POSTGRES_PORT` or `REDIS_PORT`
  in `.env`.

Other ways to run:

| Command (repo root, needs Node 24 + pnpm for the `pnpm` ones) | What runs |
|---|---|
| `pnpm stack:backend` | api, worker, Postgres, Redis; API on `localhost:3000` |
| `pnpm stack:frontend` | the web container alone, proxying to a backend on the host's port 3000 |
| `pnpm dev` | Postgres and Redis in Docker; api, worker and Vite on the host in watch mode (app on `localhost:5173`, Swagger at `localhost:3000/api/docs`) |
| `pnpm --filter frontend dev:mock` | the frontend alone, with the whole API simulated in the browser; no Docker, backend or key |

## Run the tests

You need **Node 24** and **pnpm**: `corepack enable` provides the pnpm version pinned in
`package.json`.

```sh
pnpm install
pnpm --filter @cv/shared build   # the apps import shared's build output
pnpm typecheck && pnpm lint && pnpm test

docker compose up -d postgres redis
pnpm --filter backend test:e2e   # own database and queue, a scripted model, no key
```

About 850 tests in all: `shared` 163, backend 204 unit and 162 end-to-end, frontend 324.
`pnpm test` runs the three packages at once; on a slow machine a frontend or PDF test can hit its
timeout under that load. Run that package alone (`pnpm --filter frontend test`) to confirm.

The most important ones, in order:
1. **The fact verifier.** An invented bullet becomes a `confirm` question, an unknown skill
   becomes a `multi` question, a wrong year is cleared and asked about. The same checks pass for a
   Ukrainian source with an English CV.
2. **User isolation.** User B cannot read, edit, answer, retry, download or delete user A's CV;
   every attempt answers `404`.
3. **The CV status machine.** Allowed and forbidden transitions; a stale result is dropped; delete
   during a generation.
4. **Generation with a scripted fake model.** Accepted after the verifier's feedback; a retry on a
   transient error; `failed` after 3 attempts; a non-retryable error fails at once.
5. **The prompt.** User data is escaped and never part of the instructions.
6. **The shared logic.** `applyAnswer`, `computeMatch`, `findMissing`.
7. **Answer wording with a scripted fast model.** Bullets, a summary sentence and a new job are
   worded; an invented number, title or year, a timeout or a spent budget puts the answer in as
   written.
8. **The frontend flows.** The whole app rendered against the same mock API that `dev:mock` uses.

## Architecture

```
browser ──/api, same origin, httpOnly cookie──▶ web (nginx: SPA + /api proxy)
                                                 │
                                                 ▼
         Claude Haiku 4.5 ◀── answer wording ── api (NestJS) ──▶ PostgreSQL (all data, source of truth)
                                                 │ enqueue           ▲
                                                 ▼                   │
                                         Redis (queue only) ──▶ worker ──▶ Claude Sonnet 5.5 (the draft)
```

Models: the draft uses `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), answer wording uses
`ANTHROPIC_FAST_MODEL` (default `claude-haiku-4-5`). Both can be changed in `.env`.

- **api** handles auth, PDF intake, CVs, questions, the PDF export and usage. It never waits for
  the draft: "create a CV" saves the request, enqueues a job and answers `202` at once. Its only
  model call is the short answer wording below (at most 15 s).
- **worker** (same image, BullMQ, 8 jobs at a time) runs the generation:
  1. Claude writes the draft;
  2. the server verifies every claim;
  3. what fails the check becomes a question;
  4. the result is saved to Postgres.
- **The browser** polls a light statuses endpoint every 3 s, and only while a CV is in progress.
  A reload or another device picks up from the server, so nothing is lost.
- **Code layout:** three git repos in one pnpm workspace.
  - `backend/` and `frontend/` are submodules that never import each other.
  - The root owns the contract between them: `docs/api.md`, `docs/cv-statuses.md` and the
    `@cv/shared` package.
  - `@cv/shared` holds the Zod schemas, the status machine, `findMissing`, `applyAnswer`,
    `computeMatch` and the CV languages. Both sides validate with the same schemas, so they can't
    drift apart silently.
- **Stack:**
  - backend: NestJS 11, Drizzle on PostgreSQL 17, BullMQ on Redis 7, Vercel AI SDK v7 with
    `@ai-sdk/anthropic`;
  - frontend: React 19, React Router 8, TanStack Query 5, React Hook Form with Zod, Tailwind v4,
    Vite.

## Main decisions

| Decision | Why |
|---|---|
| A background job with a status in Postgres, the queue in Redis | No frozen screen, and a reload or a worker crash loses nothing. Postgres is the only source of truth; Redis can be wiped (`backend/docs/adr/0001`). |
| Polling a statuses endpoint, no WebSocket or SSE | One small request every 3 s, only while something runs. Simpler and enough at this scale (`docs/adr/0001`). |
| One agent: a bounded tool loop with a validating tool | The model calls `submit_draft`; the tool runs the verifier and returns its problems; the model fixes them. At most 3 steps (`backend/docs/adr/0003`). |
| Facts checked by evidence quotes in the source language | The CV can be in another language than the source; a quote proves where each claim comes from (`backend/docs/adr/0004`). |
| Answers are applied in one batch and worded by one fast-model call | The user answers several cards, then "Apply N replies" sends them in one request. A free-text answer about a job's bullets, the summary or a missing job is turned into bullets, a sentence or a new job by one `generateText` call on Claude Haiku, inside the request: no agent, no loop, no new job status. The result is checked like a draft; anything that fails goes in as written. The stored fact is always the answer as the user wrote it ([`docs/adr/0002`](docs/adr/0002-answer-wording-inside-the-request.md)). |
| The target role is required; a role note or a pasted vacancy is optional context | The spec puts tailoring to a job description out of scope. The note only focuses the summary and the order, and lists the role's requirements. It is never a source of facts about the person. |
| Match is computed by code, not judged by the model | The model lists the role's requirements with keywords; `computeMatch` checks the CV against them in the browser on every edit. No invented percentages. |
| The PDF is drawn on the server with pdfkit from the saved draft | Selectable text, A4, one template; the same output on every device (`backend/docs/adr/0005`). |
| A session is a JWT in an httpOnly cookie, with no session table | Same origin through nginx, so no CORS and no token in JavaScript (`backend/docs/adr/0006`). |
| Explicit Save with an optimistic `version` | Two tabs or devices can't silently overwrite each other (`409 VERSION_CONFLICT`). |

## Keeping the AI from inventing facts

1. **Instructions.** The prompt allows rephrasing, merging and reordering, and forbids adding
   employers, titles, dates, numbers or technologies. Every claim must come with a verbatim quote
   from the source. Anything missing becomes a question.
2. **Data is not instructions.** The user's text, the role note and earlier answers go into
   escaped tags after the static instructions, and the instructions say tag content is data only.
3. **Server-side verification** (`verifyDraft`, pure and unit-tested) checks every claim:

   | What | How it is checked |
   |---|---|
   | each bullet | an evidence quote of 8+ characters found in the source or in the user's answers; every number in the bullet must appear in its quotes |
   | titles, companies, schools, degrees | must appear in the source or be backed by a quote |
   | periods | every number must appear in the source |
   | emails, phones, links | must appear in the source |
   | skills | must appear as a whole word or be backed by a quote |
   | the summary | a sentence holding an unsupported number or technology is dropped |

   The model sees the problems inside the loop and can fix them.
4. **What still fails is removed and becomes a question:**
   - a dropped bullet → "Did you…?" (`confirm`);
   - unsupported skills → "Which of these have you used?" (`multi`);
   - a cleared field → a `text` or `choice` question;
   - required parts that are missing → auto questions.
5. **Answers are facts.** The user's answers are stored as written and count as source for every
   later generation, so a confirmed claim is not asked again.
6. **Worded answers are checked too.** The fast model sees only the question, the answer and the
   part of the CV it adds to, never the source. Its result is used only if every number is in the
   answer, every technology name is in the answer or the source, a new job's title and company
   are in the answer word for word, and the shape fits (at most 3 bullets on a job, one sentence of
   at most 300 characters, a new job with 1–6 bullets). Otherwise the answer goes in as written.

The UI shows what happened, for example "12 bullets confirmed by quotes from your text, 2 sent to
you to confirm". **Known limit:** a quote proves that a fact is in the source, not that its
translation is faithful. Translation quality is trusted to the model; numbers and names are not.
The same holds for a worded answer: the check covers numbers, technology names, titles and
companies, not whether the phrasing says only what the answer meant. In a live run, the answer
"about 300 companies, 2M transactions a month, 40 partner banks" gave the bullet it should, and
also "Architected the payments API to handle enterprise-scale throughput", which the answer does
not say. It passed, since it names no new number or technology.

## Failures and untrusted input

- **Model failures:**
  - unavailable, timed out (120 s per step, 300 s per attempt) or no valid output after 3 steps →
    the CV shows `retrying`, and BullMQ retries with backoff up to 3 attempts;
  - a bad key or an internal error → `failed` at once, with Retry, and the source kept.
- **Lost work:**
  - a crashed worker's job is re-run by BullMQ's stalled-job check;
  - on start and every 60 s, the worker re-enqueues CVs whose job Redis lost;
  - a CV deleted during a generation discards the result;
  - only a CV's latest job may touch it, and status changes are compare-and-set.
- **Model output** is parsed with a Zod schema, then verified (above). A stored draft is parsed
  again before it is returned or rendered (`500 DATA_CORRUPT`, never a broken PDF).
- **User input:**
  - every request body is validated with the shared Zod schemas; the JSON body is at most 512 KB;
  - the source text is 80–20 000 characters;
  - a PDF must be a real PDF of at most 5 MB and 10 pages with a text layer (no OCR); it is never
    stored, and the user reviews the extracted text before generating.
- **Abuse and cost:**
  - 10 generations per user per hour and 4 in progress at once;
  - PDF intake 20 per minute; login 30 per minute per IP;
  - `429` with `Retry-After`. The UI shows the limits before you hit them;
  - at most 60 worded answers per user per hour; past that, answers go in as written, never `429`.
- **Answer wording fails safe:** a timeout (15 s for the batch), an API error, a bad output or an
  unbacked result puts the answer in as written; the replies are still applied.
- **Isolation:** another user's CV is `404`, never `403`. Passwords are hashed with argon2id. Logs
  leave out the user's text and the model's output unless `LOG_CONTENT` is on (development only).

## What was simplified, and what more time would change

Cut or simplified, on purpose:

- **Answer wording is one call, not an agent:** the result is checked once and never sent back
  to be fixed; what fails goes in as written for the user to edit. A new job's title and company
  are kept in the language of the answer, so they can differ from the CV's language.
- **Sessions:** a JWT can't be revoked before it expires (7 days); logout only clears the cookie.
- **Signup** says when an email is already taken (there is no email verification to hide it
  behind).
- **PDF parsing** runs on the api's event loop; a 10-page limit keeps it short.
- **Replies not applied yet** are kept in the browser (`localStorage`), not on the server: another
  device sees only the applied ones.
- **Translation faithfulness** is trusted to the model (see above).
- **Job order:** jobs are ordered most recent first. Inside a job, what matters for the role comes
  first, and the model orders the blocks by relevance.
- **Scope:** one PDF template, an English UI, scripts limited to Latin, Cyrillic and Greek (the
  PDF font). No OAuth, password reset, email verification, payments or admin, per the spec.

With more time:

- a check that a worded answer says only what the answer meant, not just its numbers and names;
- revocable sessions (a session table or a token version per user);
- PDF parsing in the worker, and OCR for scanned PDFs;
- a browser end-to-end test of the whole stack in CI: Playwright against `docker compose up` with
  a scripted model;
- an index on `cvs.parent_cv_id`;
- one source of truth for the prompt's numeric hints and the schema's bounds.

## How AI tools were used

The code was written with **Claude Code**, and every commit carries a `Co-Authored-By: Claude`
trailer. The decisions, the review and the course corrections were the author's. The work followed
one loop, written down in `workflow.md`:

1. **Grill.** A design interview (`/grill-with-docs`) worked through each open question before any
   code. The answers are kept in decision logs (`.scratch/*/decisions.md`) and in
   `docs/architecture.md` §13, each marked as confirmed by the author.
2. **Spec and tickets.** `/to-spec` and `/to-tickets` turned the outcome into a spec and small
   vertical tickets with their blockers, in the tracker of the repo that owns the work.
3. **Implement and review.** `/implement` did each ticket test-first at agreed seams, then ran
   `/code-review` against the repo's standards and the ticket.
4. **Separate sessions per repo.** The root, `backend/` and `frontend/` were worked in separate
   sessions, each bound by its own `CLAUDE.md`: conventions, checks, never commit red, the
   contract changes only at the root.
5. **Checks on the AI's work.** Typecheck, lint, tests and builds before every commit. A
   whole-stack run with the real Claude found what unit tests missed, and each finding was fixed
   in its repo; for example the CV list always showed 0 open questions, and the skills were asked
   about twice.
6. **A separate review before shipping a feature.** For batched replies, an agent cross-checked the
   backend, the frontend and the frontend's mock API against the contract, and a live run went
   through nginx with the real model. The contract matched. The review found three frontend bugs
   in rare paths, each fixed with a regression test: a CV deleted on another device kept answering
   "some questions changed" instead of Not found; Apply did nothing, without a word, when the save
   before it closed every replied question; unapplied answers stayed in the browser after logout.
   The live run found the worded bullet that says more than the answer (above); it is documented
   as a known limit rather than hidden.

## Documents

**Start here**

| Document | What it is |
|---|---|
| `docs/discovery_requirements _elicitation/` | The task spec: original PDF, plain English text, Ukrainian translation |
| `docs/architecture.md` | The design of the whole product: flow, components, the CV draft, questions, how facts are verified, CV language, match, limits, decisions |
| `docs/api.md` | The REST contract between the frontend and the backend: every endpoint, body, error code |
| `docs/cv-statuses.md` | The CV state machine: statuses, transitions, what the user can do in each |
| `docs/adr/` | Decisions that span both apps |
| `docs/uk/` | Ukrainian copies of the three design documents above |

**Each part's inside**

| Document | What it is |
|---|---|
| `backend/README.md` | Running the backend alone, its checks, and how logging works and is switched |
| `backend/docs/architecture.md` | Modules, tables, the generation agent, verification, failures and recovery, auth, logs, tests |
| `backend/docs/adr/0001–0007` | The queue, one status per CV, the agent's tool loop, evidence quotes, pdfkit, JWT cookie, Swagger |
| `frontend/docs/architecture.md` | Layers, routes, data fetching, polling, the editor, mock mode, tests |
| `frontend/docs/design.md` | The look: tokens, type, components, the glass layer |
| `frontend/docs/adr/0001–0003` | Frosted glass on one layer, the four layers, mock mode outside the layers |
| `shared/` | The `@cv/shared` package: the contract in code |

**Vocabulary, process and history**

| Document | What it is |
|---|---|
| `GLOSSARY-MAP.md` | Points to the glossaries: the domain one in `shared/GLOSSARY.md`, plus `backend/` and `frontend/` |
| `workflow.md` | How the work is organised (in Ukrainian): which folder a task starts in, spec → tickets → implementation |
| `CLAUDE.md` (root and each part) | Instructions for AI coding agents: conventions, checks, commit rules |
| `.scratch/` (root, `backend/`, `frontend/`) | The local tracker: specs, tickets, decision logs from the design interviews |
| `.scratch/handoff.md` | The state of the project for whoever picks it up; `backend/` and `frontend/` have their own |
