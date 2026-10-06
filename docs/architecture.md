# Architecture

> Status: **draft for review** — one design set, three files:
> architecture.md (this file) · [api.md](api.md) — REST contract ·
> [cv-statuses.md](cv-statuses.md) — CV state machine.
>
> Sources: the task spec (`discovery_requirements _elicitation/`), the two design chats
> (`antropick/chat.md`, `openAi/chat.md`), the states page and the clickable prototype
> (`antropick/artifacts/`). Where the chats disagreed, the choice and the reason are stated here.

## 1. Product in one paragraph

A signed-in user builds a CV **for a position**. The position title is required
("Senior Backend Engineer"); an optional short note about the position (seniority, stack, domain,
what matters) sharpens the summary, the ordering of experience and the **match** view. The user
picks the **CV language** (default English) and gives their background as a PDF or free text in
any language. A background job turns it into a structured draft
in which every fact is traceable to the source or to the user's own answers; anything missing,
vague or unconfirmed becomes a question. The user answers, edits any field, sees how well the CV
covers the role's requirements, and downloads an A4 PDF with selectable text — from a phone or a
desktop, and from any device later.

### Scope notes

- **Role note vs. "tailoring to a job description" (out of scope in the spec).** We accept
  optional free text about the role — a short note or a pasted vacancy — and use it only to
  (a) focus the summary/ordering and (b) derive a list of role requirements for the match view.
  It is never a source of facts about the person: nothing from it reaches the CV except through a
  question the user answers. The CV is generated the same way without it. (The field is still
  `roleNote`, ≤ 1 000 chars, in this doc set; the rename to `roleContext` and the 5 000 limit
  land with the API schemas.) The README states this boundary explicitly.
- **Match is a hint, not a verdict.** The model lists what the *role* needs; whether the *CV*
  covers it is computed by our code (keyword match), never a model-invented percentage.
- One PDF template, no OAuth/password reset/email verification/payments/admin (spec).

## 2. User flow

```
 sign up / log in
       │
       ▼
 My CVs ── New CV ─────────────────────────────────────────────────────────────┐
   ▲         role title* + role note (opt.) + CV language (default English)    │
   │         + background: text or PDF                                         │
   │         (PDF → server extracts text → user reviews it in the textarea)    │
   │         └─ POST /api/cvs → 202, redirect to /cvs/:id                       │
   │                                                                            ▼
   │      /cvs/:id  queued → generating → (retrying) ──────────────▶ failed ── Retry
   │                  "2 ahead of you" · "Checking facts…" · "attempt 2 of 3"
   │                                     │
   │                                     ▼
   │      needs_input / ready: editor · questions · match · preview · Download PDF
   │         answer / skip → field updated, match recomputed live
   │         edit + Save (optimistic version) · "Also fits: X" → new CV, same source
   └──────── back to list (polling shows other CVs progressing in parallel)
```

## 3. Components & deployment

```
                ┌───────────────┐ same origin /api (httpOnly JWT cookie) ┌──────────────────┐
 phone / PC ───▶│ web           │ ─────────────────────────────────────▶ │ api (NestJS)     │
                │ nginx: SPA +  │ ◀──── poll /api/cvs/statuses every 3 s │ HTTP, no LLM     │
                │ /api proxy    │                                        │ except answers*  │
                └───────────────┘                                        └──┬────────┬──────┘
                                                                   Drizzle │        │ enqueue
                                                                           ▼        ▼
                                                                 ┌──────────┐  ┌────────┐
                                                                 │ postgres │  │ redis  │
                                                                 │ source of│  │ BullMQ │
                                                                 │ truth    │  │ only   │
                                                                 └────▲─────┘  └───┬────┘
                                                                      │  Drizzle   │ consume
                                                                 ┌────┴────────────▼──────┐
                                                                 │ worker (same image,    │──▶ Anthropic API
                                                                 │ worker.ts, no HTTP)    │    (AI SDK v7)
                                                                 └────────────────────────┘
```

- **web** — Vite build served by nginx; nginx also proxies `/api` to `api`, so the cookie is
  first-party and there is no CORS. In dev the Vite proxy does the same.
- **api** — auth, CV CRUD, PDF ingest/export, questions, enqueuing. Runs migrations on start.
  *The optional AnswerAgent (§6.5) is the only LLM call made inside a request.*
- **worker** — same codebase and Docker image, entry `worker.ts`
  (`NestFactory.createApplicationContext`), loads only the BullMQ processor and the agents.
- **postgres** — the only source of truth: users, CVs, statuses, questions, attempts.
- **redis** — queue transport only. Losing it loses no data: the worker re-enqueues unfinished
  CVs on start (see [cv-statuses.md §4](cv-statuses.md#4-how-a-status-changes)).

`docker compose up` starts `web`, `api`, `worker`, `postgres`, `redis`. All containers run in UTC.
The only secret is `ANTHROPIC_API_KEY` (`.env`, see `.env.example`).

**Each subproject runs on its own.** `backend/` and `frontend/` own their `Dockerfile` and
`compose.yaml`; the root `compose.yaml` only `include`s both, so every service is defined once.
Images are built with the repo root as context, because they need `shared/` and the workspace
lockfile.

| mode | services | web's `/api` goes to |
|---|---|---|
| whole stack (root `compose.yaml`) | web, api, worker, postgres, redis | `api:3000` (set in `compose.stack.env`) |
| backend alone (`backend/compose.yaml`) | api, worker, postgres, redis | — |
| frontend alone (`frontend/compose.yaml`) | web | `host.docker.internal:3000` (backend on the host) |

nginx resolves `API_UPSTREAM` per request through Docker's DNS, so web starts before api and
survives an api restart. Startup order: postgres and redis healthy → api (runs migrations;
healthy when `GET /api/health` answers) → worker.

**Why a queue, not a background promise in the API:** reload/crash safety, retries with backoff,
concurrency control and stalled-job detection come with BullMQ; status lives in Postgres so the
UI never depends on Redis. pg-boss (no Redis) was considered — fewer moving parts, but less
familiar under a 10-hour budget. Vercel's `WorkflowAgent` solves the same problem and was skipped
for the same reason.

**Why polling, not SSE/WebSocket:** one cheap request every 3 s only while something is in
progress; survives flaky mobile connections and reloads with zero reconnection logic.

## 4. Tech stack

Rule for choices: one library per concern, used the same way in both apps; Zod is the single
schema language from the env file to the LLM output.

| concern | choice | notes / rejected |
|---|---|---|
| Monorepo | pnpm workspace: `frontend/`, `backend/`, `shared/` | the `@cv/shared` package (schemas & status machine) is imported by both — they cannot drift |
| Language | TypeScript (strict) everywhere | |
| Schemas | **Zod 4** | env config, request DTOs, `CvData`, LLM output, API response parsing on the client, forms |
| Tests | **Vitest** in all packages, `supertest` for API e2e | one runner; backend via `unplugin-swc` for decorators. Jest rejected for consistency |
| Lint / format | oxlint, Prettier | |
| **Backend** | NestJS 11 | |
| DB | PostgreSQL 17 + **Drizzle ORM** (`node-postgres`), `drizzle-kit` migrations | explicit SQL fits CAS updates and queue-position queries. Prisma / TypeORM rejected (user's choice) |
| Queue | BullMQ (`@nestjs/bullmq`) + Redis 7 | |
| LLM | **Vercel AI SDK v7** (`ai`) + `@ai-sdk/anthropic` directly (no AI Gateway → only one secret) | model from env, default `claude-sonnet-5-5`; `claude-haiku-4-5` for AnswerAgent |
| Auth | `@nestjs/jwt`, `cookie-parser`, **argon2** | JWT in httpOnly cookie, no session table |
| Rate limits | `@nestjs/throttler` (login, ingest) + counts in Postgres (generation, answers) | |
| PDF in | **unpdf** | text layer only, no OCR |
| PDF out | **pdfkit** + bundled Liberation Sans TTF (Cyrillic) | Puppeteer (Chromium in image, HTML injection), LaTeX (image size, escaping), @react-pdf/renderer (React on the server for one template) rejected |
| Logs | `nestjs-pino` | request id, job id, cv id on every line; never source text |
| **Frontend** | React 19 + Vite 8 + **React Compiler** | conventions in `frontend/CLAUDE.md` |
| Routing | React Router 8, data mode (`createBrowserRouter`, route `lazy`) | |
| Server state | **TanStack Query 5** | the only cache of server data; polling via `refetchInterval` |
| Forms | **React Hook Form** + `@hookform/resolvers/zod` | same Zod schemas as the API |
| Styling | **Tailwind CSS v4** with design tokens from the prototype (`@theme`) | light theme only; frosted glass on floating controls over a pastel backdrop (`frontend/docs/design.md`) |
| UI primitives | own small set in `src/shared/ui` on native elements (no UI kit) | prototype needs ~12 primitives; a kit would cost more than it saves; glass kits rejected in `frontend/docs/adr/0001` |
| Icons / fonts | `lucide-react` (per-icon imports), `@fontsource` Golos Text / Unbounded / JetBrains Mono | self-hosted fonts: works offline in docker, no third-party requests |

## 5. Repository & module layout

```
pnpm-workspace.yaml        frontend, backend, shared — one lockfile at the root
compose.yaml               whole stack: includes backend/ and frontend/ compose files
backend/Dockerfile         one image for api + worker (pnpm deploy --prod)
backend/compose.yaml       api, worker, postgres, redis
frontend/Dockerfile        Vite build → nginx (SPA + /api proxy)
frontend/compose.yaml      web
shared/src/                the @cv/shared package; tsdown (ESM + CJS); no runtime deps but zod
  cv-status.ts             CvStatus, CV_TRANSITIONS, isInProgress, hasDraft, stages
  cv-data.ts               CvData schema (eight blocks, sectionOrder) + limits
  cv-missing.ts            findMissing, isSectionEmpty, dropEmptyItems — pure
  question.ts              Question / answer schemas
  requirements.ts          Requirement schema
  cv-language.ts           CV_LANGUAGES allow-list: names, section headings, auto-question texts
  match.ts                 computeMatch(data, requirements) — pure, used by web and backend
  api.ts                   request/response schemas of api.md
backend/src/
  main.ts · worker.ts · app.module.ts · worker.module.ts
  config/                  env schema (zod), limits, model names
  database/                drizzle schema, migrations, db provider
  common/                  JwtAuthGuard, @CurrentUser, ZodValidationPipe, error filter
  auth/                    signup, login, logout, me
  cvs/                     CRUD, ownership, optimistic version, fromCvId copy
    cv-status.service.ts   the ONLY writer of cvs.status (CAS, canTransition)
  ingest/                  PDF → text (unpdf), size/page/text limits
  generation/              enqueue, limits, statuses + queue position, processor (worker only)
  questions/               answer / skip; apply-answer.ts (pure); auto-questions.ts (pure)
  agents/                  LLM layer — knows nothing about DB, HTTP or queue
    prompt/                PromptBuilder, escapeTags, system/*.system.ts (+ PROMPT_VERSION)
    draft/                 DraftAgent: tool loop with submit_draft
    answer/                AnswerAgent (optional, §6.5)
    verify/                verifyDraft (pure): facts vs source + user facts
    llm.ts                 model factory; replaced by a scripted fake in tests
  pdf/                     render-cv-pdf.ts, templates/classic.ts, fonts/
frontend/src/
  app/                     router, providers, layouts, error boundary
  features/auth · cv-list · cv-create · cv-editor (editor, questions, match, preview)
  shared/                  api client, ui primitives, format, hooks
```

Rules:
- Ownership checks live in `cvs`; other modules get a CV only through `CvsService.getOwned(id, userId)`.
- Pure functions (`PromptBuilder`, `verifyDraft`, `applyAnswer`, `buildAutoQuestions`,
  `computeMatch`, `renderCvPdf`) have no I/O and carry most unit tests.
- `agents/` returns plain results; `generation/` decides what to persist.

## 6. Generation pipeline

### 6.1 Data model (Postgres, Drizzle)

**users** — `id uuid pk`, `email text unique` (lower-cased), `password_hash` (argon2id), `created_at`.

**cvs**

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid → users, cascade | every query filters by it |
| parent_cv_id | uuid null → cvs, set null | set when created "for another role" from this CV |
| title | text | defaults to `target_role`, user-editable |
| target_role | text | 2–100 chars, required, immutable |
| role_note | text null | ≤ 1 000 chars, optional, immutable |
| language | text | `CvLanguage` code (§6.7), default `en`, immutable |
| source_type | `text` \| `pdf` | |
| source_filename | text null | for display only |
| source_text | text | 80–20 000 chars; reused by retries and new-role CVs |
| facts | jsonb | `{question, answer}[]` — user-provided facts, fed into every later prompt |
| status | CvStatus | [cv-statuses.md](cv-statuses.md); index `(status, created_at)` |
| stage | text null | generating sub-step |
| attempt, max_attempts | int | |
| error_code, error | text null | only when `failed` |
| data | jsonb null | `CvData`, null until the first draft |
| requirements | jsonb | `Requirement[]` (§7) |
| suggested_roles | jsonb | `string[]` ≤ 3 |
| verification | jsonb null | report: `{verified, sentToConfirm, skillsToConfirm, cleared}` — shown in UI |
| version | int | +1 on every write of `data`; optimistic locking |
| created_at, updated_at | timestamptz | |

**cv_questions** — `id`, `cv_id → cvs cascade`, `kind` (`text|choice|multi|confirm`),
`origin` (`model|verifier|auto`), `text`, `label` (short field name, e.g. "English"),
`options jsonb`, `claim text null` (for `confirm`), `target jsonb` (§6.4), `status`
(`open|answered|skipped`), `answer jsonb null`, `position int`, `created_at`, `answered_at`.

**generation_jobs** — one row per attempt: `id` (= BullMQ jobId), `cv_id`, `user_id` (copied from
the CV, never from a request), `attempt`, `status` (`running|succeeded|failed`), `model`,
`prompt_version`, `agent_steps`, `input_tokens`, `output_tokens`, `duration_ms`, `error`,
`created_at`, `finished_at`. Used for audit and for the hourly generation limit.

Why no `cv_sources` table / job-level status (proposed in the OpenAI chat): a CV is generated once
and re-targeting creates a new CV that copies `source_text` + `facts`, so a shared source row adds
a join without a use case; and keeping one CV status (instead of CV status + job status) gives the
UI a single string to map. Revisit if "regenerate this CV" is ever added.

### 6.2 `CvData` (shared/cv-data.ts)

```ts
CvData = {
  contacts: { fullName, email, phone, location: string | null; links: string[] /* ≤5 */ },
  summary: string | null,                                   // 2–4 sentences, role-targeted
  experience: { id, title, company, period: string | null;  // ≤10, most relevant first
                bullets: string[] /* ≤12 × ≤400 */ }[],
  projects:   { id, name, period, url: string | null; bullets: string[] }[],   // ≤6
  education:  { id, institution, degree, period: string | null }[],            // ≤6
  certifications: { id, name, issuer, year: string | null }[],                 // ≤10
  skills: string[],                                         // ≤40 × ≤60, no languages
  languages:  { id, name, level: string | null }[],         // ≤8
  sectionOrder: MovableSection[],                           // the seven blocks below contacts
}
```

- **Eight blocks**: the five the spec names plus Projects, Certifications and Languages. Courses,
  awards, publications, volunteering and interests are not blocks.
- **Every field may be empty** — the model must not invent it — so the schema requires nothing.
  What a CV *should* have is a separate rule, `findMissing` in `shared/cv-missing.ts`:

  | block | required | when empty |
  |---|---|---|
  | contacts: `fullName` and at least one of `email` / `phone` | yes | a question per missing field |
  | summary | yes | a question |
  | skills | yes | the `multi` question (§6.5) |
  | experience | yes, "no experience" allowed | a skippable question |
  | education, projects, certifications, languages | no | block absent, no question |

  Inside an existing item, an empty `title` / `company` / `period` (experience) or `institution`
  (education) is also missing. A missing block or field is marked in the editor and listed next to
  the PDF button; it never blocks the download.
- **Block order** is part of the draft: `sectionOrder` lists the seven movable blocks, each
  exactly once (anything else is rejected). Contacts is always first. A new draft gets the fixed
  default — summary, experience, projects, education, certifications, skills, languages — the model
  does not choose it; the user reorders blocks in the editor.
- Items have UUID ids, unique within the draft (assigned by the server for a generated draft, by
  the client for items added in the editor), so questions and edits survive reordering. Bullets
  and skills are plain strings — nothing targets a single bullet.
- Empty = absent: `null`, `""`, `[]` are not rendered in the preview or the PDF, and a block with
  nothing in it has no heading (`isSectionEmpty`). Items whose every field is empty are dropped on
  save, together with blank bullets, skills and links (`dropEmptyItems`).
- Length limits (`CV_LIMITS`): 200 chars for a short field (name, title, company, period, level…),
  300 for a link, 2 000 for the summary, on top of the counts above.
- Dates, years and language levels stay as source text ("2019 – present", "fluent"); normalising
  would invent precision. For a language without a level the model is told to ask a `choice`
  question (A1–C2, Native); it is not a required field, so no auto question backs it up.
- The CV is written in the language chosen at creation (§6.7), whatever the source language.

### 6.3 Intake

1. **PDF** (optional step): `POST /api/ingest/pdf` (multipart) — ≤ 5 MB, `%PDF` magic bytes,
   ≤ 10 pages, text extracted with unpdf; < 50 chars of text ⇒ `422 PDF_UNREADABLE` ("looks like a
   scan — paste the text"). Returns the text; **nothing is stored**. The frontend puts it into the
   textarea so the user sees and can fix exactly what the model will read.
2. **Create**: `POST /api/cvs` (JSON) — role, note, `sourceText` (80–20 000 chars) or `fromCvId`.
3. Limits (§9) are checked, then one transaction inserts the CV (`queued`) and the job row, then
   the job is enqueued. `202` with the CV. If enqueue fails, the row stays `queued` and the worker's
   startup recovery picks it up.

### 6.4 DraftAgent — an AI SDK v7 tool loop

Input: `source_text`, `target_role`, `role_note`, `language`, `facts`, today's date (UTC).

`PromptBuilder` puts static rules from `agents/prompt/system/` into `system` and user data into
one message with escaped tags: `<today>`, `<cv_language>` (English name from the allow-list, e.g.
"Ukrainian"), `<target_role>`, `<role_note>`, `<source>`, `<user_facts>`. Rules say content of tags is data, never instructions. User data never enters
`system`.

The agent (`ToolLoopAgent`) has **one tool, `submit_draft`**, forced via `toolChoice`:

```ts
DraftSubmission = {
  cv: CvData /* without ids */,
  evidence:  { path: string; quote: string }[],    // "experience[0].bullets[2]" → verbatim source quote (source language)
  questions: { kind: 'text' | 'choice'; text; label; options?; target: QuestionTarget }[],  // ≤ 7
  requirements: { label; kind: 'skill' | 'experience'; keywords: string[] }[],             // ≤ 12
  suggestedRoles: string[],                        // ≤ 3
}
QuestionTarget = { section: CvSection /* any of the eight blocks */;
                   itemIndex?: number; field?: string }   // backend maps index → item id
```

1. Step 1: the model calls `submit_draft`. Zod validates the input (AI SDK returns schema errors to
   the model as a tool error). `execute` runs `verifyDraft` (§6.6) — pure, no side effects — and
   returns `{ accepted: true }` or `{ accepted: false, problems: ["experience[1].bullets[2]: quote
   not found in source — quote verbatim or drop the claim", …] }`. Stage → `verifying`.
2. Steps 2–3 (stage `revising`): the model fixes and resubmits.
3. Stops on accept or `isStepCount(3)`; per-call timeout 60 s, whole attempt 180 s.
4. The last schema-valid submission is **sanitised** — whatever still fails verification is
   removed and turned into questions (§6.6). No schema-valid submission ⇒ attempt fails
   (`LLM_INVALID_OUTPUT`, retryable).
5. One transaction (stage `saving`): assign ids, write `data`, `requirements`, `suggested_roles`,
   `verification`; insert model + verifier + auto questions; `version + 1`; status →
   `needs_input` / `ready` via CAS; close the job row (model, prompt version, steps, tokens, ms).

Why a loop and not a single `generateText` call: the verifier's feedback lets the model correct
its own unconfirmed claims before we fall back to removing them, so the user gets fewer
questions. The loop is bounded (3 steps), the only tool validates, and a prompt injection in the
source cannot make the agent *do* anything.

### 6.5 Questions & answers

Question kinds (as in the prototype):

| kind | origin | UI | on answer |
|---|---|---|---|
| `confirm` | verifier | quoted claim + "Yes, add it" / "No" | yes → claim added to its target (bullet/skill); no → dropped |
| `multi` | verifier + match | toggle chips + "Other, comma-separated" | ticked items appended to `skills` (dedup) |
| `choice` | model | chips + "Other" with input | value written to target |
| `text` | model / auto | input | value written to target |

- `choice` only where the answer set is generic (English level, employment type, team size),
  never model-guessed facts ("3 / 5 / 7 years").
- **Auto questions** (deterministic, `buildAutoQuestions`) for everything `findMissing` reports
  (§6.2): required blocks and required fields of existing items — unless the model already asked
  about that field. The experience question can be skipped ("no experience").
- **One `multi` question** "Which of these have you worked with? Only what you tick goes into the
  CV" — options = skills the model wrote but the source doesn't confirm ∪ `skill` requirements not
  covered by the CV (§7), max 8. Options are built by our code, not by the model.
- Caps: ≤ 12 open questions per CV; ≤ 5 `confirm`; ≤ 7 from the model. `text`, `choice`, `multi`
  can be skipped; `confirm` is answered yes/no.
- Target must point to an existing field, else the question is dropped.

Answer flow (`POST …/answer`, synchronous, in the API):

1. Ownership, CV `needs_input`, question `open`, answer ≤ 1 000 chars, matches its kind.
2. `applyAnswer` (pure): scalar targets (contacts, `period`, `degree`, …) are written directly;
   `skills` targets append `"{label}: {value}"` (e.g. "English: B2"); `summary`/`bullets` targets
   append the answer as a sentence/bullet.
3. *Optional* **AnswerAgent** for `summary`/`bullets` targets: rewrites only that section using the
   answer, verified like §6.6 against source + facts; 15 s timeout ⇒ fall back to step 2's as-is
   insert. First to cut (§12).
4. One transaction: update `data`, append `{question, answer}` to `facts`, question → `answered`,
   `version + 1`; if no open question remains → `ready` (CAS). Returns the full CV.

The frontend saves unsaved edits **before** sending an answer (prototype behaviour), so an answer
never overwrites or is overwritten by local edits.

### 6.6 Keeping the AI from inventing facts

Every *fact* in the CV must be traceable to `source_text` or `facts`. `verifyDraft(submission,
source, facts)` is pure; normalisation = lower-case, collapse whitespace, unify quotes/dashes.

The CV may be in another language than the source, so text facts are checked through **evidence
quotes in the source language**, and everything language-neutral (numbers, emails, phones, URLs,
technology names) is checked directly:

| field | rule | if it fails after the loop |
|---|---|---|
| experience / project bullet | `evidence` quote (≥ 8 chars) found in source/facts; every number in the bullet appears in that quote | removed → `confirm` question with the claim |
| title, company, institution, degree, project name, certification name and issuer, language name | substring of source/facts, **or** an `evidence` quote found in source/facts (translated text) | cleared → `text` question |
| period, certification year | every number in it appears in source/facts | cleared → `text` question |
| language level | appears in source/facts | cleared → `choice` question |
| email, phone, links | verbatim (phone compared by digits) | cleared → auto question |
| skills | appears in source/facts (tech names are language-neutral), or has an `evidence` quote | moved to the `multi` question |
| summary | every number and every skill-like token is already in verified data | cleared → auto question |
| question target | points to an existing field | question dropped |
| requirements | bounded length/count, ≥ 1 keyword | invalid entries dropped (they describe the role, not the person) |
| suggested roles | ≤ 3, ≤ 100 chars | trimmed |

Known limit (README): a quote proves the fact exists in the source, not that its translation is
faithful — translation quality is trusted to the model, numbers and names are not.

`verification` stores the counts; the UI shows "12 bullets confirmed by quotes from your text,
2 sent to you to confirm, 1 skill moved to suggestions". Confidence scores from the model are not
used — there is nothing to check them against.

### 6.7 CV language

- Picked on the New CV screen in a native `<select>` (combobox), **default English**; sent as
  `language` in `POST /api/cvs`, stored in `cvs.language`, immutable. A CV "for another role"
  (`fromCvId`) gets the parent's language preselected and may change it.
- Allow-list `CV_LANGUAGES` in `shared/src/cv-language.ts` — one entry per language: code, English
  name (for the prompt), native name (for the select), section headings (preview + PDF) and
  auto-question templates. Initial list: `en` English, `uk` Українська, `pl` Polski, `de` Deutsch,
  `fr` Français, `es` Español. Adding a language = one entry. Limited to scripts the bundled
  Liberation Sans covers (Latin, Cyrillic, Greek); CJK/Arabic would need another font.
- The server accepts only codes from the list (`400` otherwise) and puts the **English name from
  the list** into `<cv_language>`, never user text — no injection surface.
- **Follows the CV language:** all CV text; model and auto question texts (so answers come back in
  the same language); requirement labels (keywords include CV-language terms and English tech
  names, §7); section headings in preview and PDF.
- **Doesn't:** the UI (English), error messages, the source (any language). Company and
  institution names keep their spelling from the source unless the source itself gives the name
  in the CV language.
- Answers in another language are inserted as written; AnswerAgent, when enabled, also translates
  them into the CV language.

## 7. Role targeting & match

- **Inputs:** `target_role` (required), `role_note` (optional). Both are immutable per CV — the
  summary and ordering were generated for them. Another role = another CV.
- **Requirements** come from DraftAgent in the same call: up to 12 `{label, kind, keywords}`
  ("PostgreSQL" · skill · ["postgres", "postgresql"]; "Team leadership" · experience · ["led",
  "mentored", "team lead"]). They describe the role, so they are not fact-checked against the
  source — only bounded. Labels are in the CV language; keywords are in the CV language plus
  English technology names, because they are matched against the CV text.
- **Match** = `computeMatch(data, requirements)` in `shared/match.ts`: a requirement is *covered*
  when any keyword occurs (normalised, word-boundary) in the CV's summary, titles, bullets or
  skills. Result: `{ covered, total, items: [{ id, label, kind, covered, foundIn }] }`.
  - Runs **in the browser on every edit** (deferred) — answering "PostgreSQL ✓" or typing a bullet
    turns the requirement green immediately, no request, no LLM.
  - Runs on the backend after the draft to build the `multi` question from uncovered `skill`
    requirements.
- **UI:** "Covers 7 of 10 requirements" bar in the CV header; the Match tab lists covered (with
  where found) and missing ones; missing `experience` requirements show "Add it in the editor if
  it's true" — never auto-inserted.
- **Suggested roles:** "Also fits: Node.js Tech Lead" chips → `/cvs/new?fromCvId=…&role=…` →
  `POST /api/cvs { fromCvId, targetRole }` copies `source_text` + `facts`; counts toward limits.

## 8. Failure handling

| failure | handling |
|---|---|
| Anthropic 429/5xx/overloaded, network, timeout | attempt failed → `retrying`, BullMQ exponential backoff (5 s base), 3 attempts → `failed` |
| no schema-valid submission after 3 agent steps | same, `LLM_INVALID_OUTPUT` |
| invalid API key / request rejected as invalid | non-retryable → `failed` (`LLM_CONFIG`/`INTERNAL`) at once, no wasted attempts |
| worker crash mid-attempt | BullMQ stalled-job detection re-runs it; CAS writes make re-runs idempotent |
| Redis wiped / enqueue failed | worker start: re-enqueue CVs in `queued`/`generating`/`retrying` (jobId dedups) |
| CV deleted during generation | final CAS hits 0 rows → result discarded |
| stale tab / two devices edit | `version` mismatch → `409 VERSION_CONFLICT` → UI offers "Reload latest" |
| corrupt `data` in DB | parsed with Zod before render/return → `500 DATA_CORRUPT`, never a broken PDF |
| prompt injection in source/note/answers | data only in escaped tags; system rules; only tool validates; output verified |
| huge/malicious input | size/page/char limits before anything reaches the LLM; PDF text only, no OCR |
| frontend: request fails | query error state with Retry; mutations show inline error; 401 → back to login |

## 9. Auth, isolation & limits

- `signup`/`login` → JWT `{ sub: userId }` (7 days) in an `httpOnly`, `SameSite=Lax` cookie
  (`Secure` behind HTTPS). argon2id. Same error for unknown email and wrong password. Login
  throttled.
- `JwtAuthGuard` on everything except signup/login; `userId` only from the verified token
  (`verify`, never `decode`). DTOs are Zod-parsed — unknown keys (e.g. `userId`) are stripped.
- Every CV query filters by `user_id`; foreign CV ⇒ `404`, not `403`. The worker takes `user_id`
  from the job row.
- Limits (config): 10 generations/user/hour, ≤ 2 in progress per user, 60 answers/hour,
  ingest 20/min → `429` + `Retry-After`.
- Known simplifications (README): JWT can't be revoked before expiry; signup reveals that an email
  is taken; count-then-insert race on limits is accepted.

## 10. PDF export

`GET /api/cvs/:id/pdf` renders on the fly from the **saved** `data` with pdfkit: A4 (595×842 pt),
50 pt margins, embedded Liberation Sans Regular/Bold (Cyrillic), real text ⇒ selectable.
Layout from the prototype: name 20 bold; contacts line joined with " · "; section headings
9 pt bold uppercase with a rule, text taken from `CV_LANGUAGES[cv.language]` ("Experience" /
"Досвід"). Contacts first (email, phone, location, links), then the blocks in `data.sectionOrder`:

| block | heading line | muted line | below |
|---|---|---|---|
| summary | — | — | one paragraph |
| experience | "Title, Company" | period | bullets |
| projects | name | "period · url" | bullets |
| education | "Institution, Degree" | period | — |
| certifications | "Name, Issuer" | year | — |
| skills | — | — | one paragraph, joined with ", " |
| languages | — | — | one paragraph: "Name (Level)", joined with ", " |

Bullets "•" indented 14 pt. Empty fields/blocks are skipped, and so is the separator next to a
missing part ("Title" alone, not "Title, "); pdfkit paginates.
One template behind `type CvTemplate = (cv, doc) => void`. Filename = sanitised title.

The in-app preview is an HTML "sheet" (A4 aspect ratio, same fonts and sizes in container-query
units) rendered from **unsaved** form values; Download saves first, then fetches the server PDF.

## 11. Frontend

### Routes (React Router data mode, every screen lazy-loaded)

| path | screen | loader |
|---|---|---|
| `/login`, `/signup` | auth form | redirect to `/` if already signed in |
| `/` | My CVs | protected layout: `ensureQueryData(me)` → 401 ⇒ redirect `/login?next=…` |
| `/cvs/new` | New CV (`?fromCvId=&role=` prefill for suggested roles) | |
| `/cvs/:cvId` | CV — content by status group | prefetch CV |
| `*` | Not found | |

The URL is the navigation state: deep links and the back button work; a reload on `/cvs/:id`
resumes polling.

### Data layer

- `shared/api/client.ts`: `fetch` wrapper, `credentials: 'same-origin'`, parses every response
  with the Zod schema from `shared/api.ts`, throws `ApiError { status, code, message, details }`.
- Query options factories per feature (`cvQueries.list()`, `cvQueries.detail(id)`,
  `cvQueries.statuses(ids)`), keys `['cvs', …]`, `['me']`.
- **Polling:** the list and the CV page run `statuses(ids of in-progress CVs)` with
  `refetchInterval: 3000`, enabled only while that list is non-empty (also pauses in background
  tabs). When a CV leaves the in-progress group → invalidate `['cvs','list']` and
  `['cvs','detail',id]`. The full CV JSON is never polled.
- Mutations return the full CV → `setQueryData`, no refetch. 401 from any request → clear `['me']`
  → router redirects to login.

### Screens

- **Auth** — one card form + the prototype's "how it works" steps (desktop only).
- **My CVs** — rows: title, status pill, open questions count, match "7/10", updated time
  (`Intl.DateTimeFormat` in the device locale); actions by status group: Open / Watch progress /
  Retry / Delete (inline two-step confirm). Empty state explains what's needed.
- **New CV** — role title*, role note (optional, with hint what to put there), **CV language**
  (native `<select>` with native names, default English — a native select gives the phone's own
  picker and full a11y for free), background textarea
  with "Upload PDF" (→ ingest → text appears, "Extracted 3 120 chars from 2 pages, check below")
  and a char counter; remaining generations this hour (`GET /api/usage`). Submit → `/cvs/:id`.
  Unsent form autosaves to `sessionStorage`.
- **CV** —
  - *in progress:* status pill, stage text / "N ahead of you" / "attempt 2 of 3", indeterminate
    bar, "You can close this page". `aria-live="polite"`.
  - *failed:* error text, Retry, Delete.
  - *has draft:* header (title, role, match bar, suggested roles, Download PDF); **editor**
    (all eight blocks; items with up/down/remove/add; blocks below contacts with up/down; skills
    as chips; bullets as one textarea, one per line; missing required blocks marked); side panel tabs **Questions · N** / **Match** / **Preview**;
    sticky **save bar** when dirty (Cancel / Save); verification report notice; conflict notice.

### Layout

- **≥ 980 px:** two columns — editor left (`1.08fr`), side panel right (`.92fr`) with tabs
  Questions / Match / Preview.
- **< 980 px:** one column, segmented control **Edit · Questions N · Match · Preview**; one panel
  at a time; save bar sticky at the bottom with `env(safe-area-inset-bottom)`.
- Mobile first: touch targets ≥ 40 px, inputs 16 px font (no iOS zoom), list rows stack ≤ 760 px.

### Rendering strategy (no needless re-renders)

- The editor is one RHF form; `key={cv.id + ':' + cv.version}` remounts it with fresh
  `defaultValues` when the server version changes (no syncing effects).
- Inputs are uncontrolled (`register`); arrays via `useFieldArray`; dirty state is read only inside
  `SaveBar` via `useFormState` — typing doesn't re-render the page.
- `Preview` and `MatchPanel` subscribe with `useWatch` and render from `useDeferredValue(values)`
  — typing stays responsive while the sheet and match update a moment later.
- Questions panel and progress card read only their slice via Query `select`.
- React Compiler handles memoisation; rules in `frontend/CLAUDE.md`.

### Design system

Owned by the frontend: `frontend/docs/design.md` (tokens, glass, backdrop, primitives, layouts,
states) and `frontend/docs/adr/`. In short: prototype tokens and fonts, light theme only, a
pastel backdrop with frosted glass only on floating controls (top bar, tabs, save bar, auth
card), own primitives, status → tone (queued neutral, generating accent, retrying & needs_input
wait, failed bad, ready ok).

UI language: English (see §13). Dates and numbers formatted with `Intl` in the device locale.

## 12. Tests (priority) & cut order

Tests, most important first:
1. `verifyDraft` + sanitise: invented bullet → `confirm`, unknown skill → `multi`, wrong year → cleared + question; same checks pass for a Ukrainian source → English CV (quotes in Ukrainian, numbers intact).
2. Isolation e2e: user B can't read/edit/answer/retry/download/delete user A's CV (all 404).
3. Status machine: allowed/forbidden transitions; CAS drops a stale result; delete mid-generation.
4. Generation with a scripted fake model: accepted on step 2 after feedback; retry on transient error; `failed` after 3; non-retryable → `failed` at once.
5. `PromptBuilder`: tags escaped, user data never in `system`.
6. `applyAnswer` / `buildAutoQuestions` / `computeMatch`.
7. PDF: text extractable, 595×842, empty CV has no headings/`undefined`.
8. Intake limits: non-PDF, scan, too big, too long text, 429.
9. Frontend (Vitest + Testing Library): status → screen mapping, question card validation.

If time runs short, cut in this order (reliability items above are never cut):
1. AnswerAgent → as-is insertion only.
2. Suggested roles / `fromCvId`.
3. `GET /api/usage`, sessionStorage autosave.
4. Match panel UI (requirements still generated and used for the `multi` question).

## 13. Decisions

| # | question | decision |
|---|---|---|
| 1 | Role note vs "no JD tailoring" in the spec | **confirmed:** the role title is the main, required input; the description is optional free text — a short note or a pasted vacancy — used as role context and never as a source of facts; README explains |
| 2 | Match computation | **confirmed:** deterministic keyword match in `shared/match.ts`, no model score |
| 3 | `retrying` as its own status | **confirmed:** keep (user sees "attempt 2 of 3") |
| 4 | PDF intake | **confirmed:** server extracts, user reviews text before generation (prototype UX + server-side handling of untrusted files) |
| 5 | AnswerAgent | **confirmed:** design it, build it last; until then answers are inserted as written |
| 6 | `shared/` as a workspace package | **confirmed by user:** yes — status machine, schemas and `computeMatch` must be identical on both sides; frontend and backend stay independent subprojects with their own Dockerfile and compose file (§3) |
| 7 | UI language | **confirmed:** English (spec and reviewers are English-speaking) |
| 7a | CV language | **confirmed by user:** chosen at creation, default English, sent to the server and the agent (§6.7); initial language list to confirm |
| 8 | Explicit Save vs autosave | **confirmed:** explicit Save + sticky save bar (prototype), save-before-answer |
| 9 | CV blocks | **confirmed by user:** eight blocks, required vs optional, user-changeable block order (§6.2) |
