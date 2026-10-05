# Architecture

> Status: **draft for review** — one design set, three files:
> architecture.md (this file) · [api.md](api.md) — REST contract ·
> [cv-statuses.md](cv-statuses.md) — CV state machine.
>
> The inside of each subproject has its own document: `backend/docs/architecture.md` (tables,
> agent, verification, failures, auth, PDF rendering) and `frontend/docs/architecture.md`. This
> file keeps what the whole system shares.
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
  question the user answers. The CV is generated the same way without it. The field is
  `roleContext`, ≤ 5 000 chars. The README states this boundary explicitly.
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
  No LLM call is made inside a request.
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

**Why a queue:** [backend/docs/adr/0001](../backend/docs/adr/0001-queue-in-redis-status-in-postgres.md).
**Why polling, not SSE/WebSocket:** [docs/adr/0001](adr/0001-poll-statuses-not-push.md).

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
| LLM | **Vercel AI SDK v7** (`ai`) + `@ai-sdk/anthropic` directly (no AI Gateway → only one secret) | model from env, default `claude-sonnet-5-5`|
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
backend/src/                 tree and rules: backend/docs/architecture.md §1
frontend/src/
  app/                     router, providers, layouts, error boundary
  features/auth · cv-list · cv-create · cv-editor (editor, questions, match, preview)
  shared/                  api client, ui primitives, format, hooks
```

Where code goes inside a subproject: `backend/docs/architecture.md` §1,
`frontend/docs/architecture.md` §1.

## 6. Generation pipeline

### 6.1 Data model (Postgres, Drizzle)

Postgres holds users, CVs (source, user facts, status, draft, requirements, version), questions
and one row per generation attempt. Tables and columns: `backend/docs/architecture.md` §2.

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

The worker runs **DraftAgent**: one AI SDK v7 tool loop with a single validating tool,
`submit_draft`. One submission carries the draft, evidence quotes from the source, up to 7
questions, up to 12 requirements (§7) and up to 3 suggested roles. The verifier's feedback lets
the model fix its claims for up to 3 steps; whatever still fails becomes a question (§6.6). The
result is saved in one transaction and the CV goes to `needs_input` or `ready`. Prompt, tool
schema, steps and timeouts: `backend/docs/architecture.md` §3.

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
3. One transaction: update `data`, append `{question, answer}` to `facts`, question → `answered`,
   `version + 1`; if no open question remains → `ready` (CAS). Returns the full CV.

The frontend saves unsaved edits **before** sending an answer (prototype behaviour), so an answer
never overwrites or is overwritten by local edits.

An AnswerAgent that rewrites the summary or a bullet around the answer was designed and cut
(§13 row 5): the answer goes into the CV as written. The README lists it under "with more time".

### 6.6 Keeping the AI from inventing facts

Every *fact* in the CV must be traceable to `source_text` or `facts`. The server checks each
part of the draft against the source — text through evidence quotes in the source language,
numbers, contacts and technology names directly — and whatever fails is removed or cleared and
turned into a question (`confirm` for a bullet, `multi` for a skill, `text` / `choice` for a
field). `verification` stores the counts the UI shows ("12 bullets confirmed by quotes from your
text, 2 sent to you to confirm, 1 skill moved to suggestions"). The rules per field:
`backend/docs/architecture.md` §4.

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
- Answers in another language are inserted as written.

## 7. Role targeting & match

- **Inputs:** `targetRole` (required), `roleContext` (optional). Both are immutable per CV — the
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

Generation retries transient model errors (3 attempts with backoff), fails at once on
non-retryable ones, survives a worker crash or a wiped Redis, and drops a result for a deleted
CV; stale edits get `409 VERSION_CONFLICT`, a corrupt stored draft `500 DATA_CORRUPT`. The full
table: `backend/docs/architecture.md` §5. Frontend side: a failed query shows Retry, a failed
mutation an inline error, `401` returns to login.

## 9. Auth, isolation & limits

- Sessions are a JWT in an `httpOnly` cookie set by signup/login; same error for unknown email and
  wrong password.
- Every CV belongs to one user; someone else's CV ⇒ `404`, not `403`.
- Limits: 10 generations/user/hour, ≤ 2 in progress per user, 60 answers/hour, ingest 20/min →
  `429` + `Retry-After`. A generation is what the user starts — creating a CV or a manual Retry;
  automatic retries of a failed attempt don't count.
- Known simplifications (README): JWT can't be revoked before expiry; signup reveals that an email
  is taken; count-then-insert race on limits is accepted.
- How it is enforced: `backend/docs/architecture.md` §6.

## 10. PDF export

`GET /api/cvs/:id/pdf` renders on the server from the **saved** `data`: A4, real text ⇒
selectable. Layout from the prototype: name 20 bold; contacts line joined with " · "; section
headings 9 pt bold uppercase with a rule, text taken from `CV_LANGUAGES[cv.language]`
("Experience" / "Досвід"). Contacts first (email, phone, location, links), then the blocks in
`data.sectionOrder`:

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
missing part ("Title" alone, not "Title, "). Filename = sanitised title. How it is drawn
(pdfkit, fonts, margins, pages): `backend/docs/architecture.md` §7.

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

Tests by importance: `backend/docs/architecture.md` §8 (verifier, isolation, status machine,
generation with a fake model…), `frontend/docs/architecture.md` §9, `shared` unit tests next to
each module.

Already cut: AnswerAgent (answers go in as written). If time runs short, cut next in this order
(reliability items above are never cut):
1. Suggested roles / `fromCvId`.
2. `GET /api/usage`, sessionStorage autosave.
3. Match panel UI (requirements still generated and used for the `multi` question).

## 13. Decisions

| # | question | decision |
|---|---|---|
| 1 | Role note vs "no JD tailoring" in the spec | **confirmed:** the role title is the main, required input; the description is optional free text — a short note or a pasted vacancy — used as role context and never as a source of facts; README explains |
| 2 | Match computation | **confirmed:** deterministic keyword match in `shared/match.ts`, no model score |
| 3 | `retrying` as its own status | **confirmed:** keep (user sees "attempt 2 of 3") |
| 4 | PDF intake | **confirmed:** server extracts, user reviews text before generation (prototype UX + server-side handling of untrusted files) |
| 5 | AnswerAgent | **cut by user:** answers are inserted as written; README lists it under "with more time" |
| 6 | `shared/` as a workspace package | **confirmed by user:** yes — status machine, schemas and `computeMatch` must be identical on both sides; frontend and backend stay independent subprojects with their own Dockerfile and compose file (§3) |
| 7 | UI language | **confirmed:** English (spec and reviewers are English-speaking) |
| 7a | CV language | **confirmed by user:** chosen at creation, default English, sent to the server and the agent (§6.7); initial language list to confirm |
| 8 | Explicit Save vs autosave | **confirmed:** explicit Save + sticky save bar (prototype), save-before-answer |
| 9 | CV blocks | **confirmed by user:** eight blocks, required vs optional, user-changeable block order (§6.2) |
