# REST API

> Status: **draft for review** — part of the design set
> [architecture.md](architecture.md) · api.md (this file) · [cv-statuses.md](cv-statuses.md).
> Request/response schemas live in the `@cv/shared` package (`shared/src/api.ts`, with the draft,
> question and requirement schemas next to it; Zod) and are used by both apps.

## Conventions

- Base path `/api`, same origin as the SPA (nginx / Vite proxy). JSON in and out, except
  `POST /api/ingest/pdf` (multipart) and `GET /api/cvs/:id/pdf` (binary).
- **Auth:** JWT in an `httpOnly` cookie set by signup/login; the frontend never sees the token.
  Everything except `signup`/`login`, `logout` and `health` requires it → `401 UNAUTHORIZED`.
- A CV that doesn't exist **or belongs to another user** → `404 NOT_FOUND` (never `403`).
- Ids are UUIDs. Timestamps are ISO-8601 UTC; the frontend formats them in the device locale.
- Bodies are parsed with Zod; unknown keys are stripped (a `userId` in a body is ignored).
- Actions not allowed in the CV's current status → `409 INVALID_STATE` — full table in
  [cv-statuses.md §3](cv-statuses.md#3-allowed-actions-by-status).

### Errors

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "The CV was changed elsewhere.", "details": {} } }
```

| HTTP | code | when |
|---|---|---|
| 400 | `VALIDATION_ERROR` | invalid body/query; `details.fields`: `{ "targetRole": "Required" }` |
| 401 | `UNAUTHORIZED` | no / invalid / expired cookie |
| 401 | `INVALID_CREDENTIALS` | login failed (same for unknown email and wrong password) |
| 404 | `NOT_FOUND` | missing or not owned (CV or question) |
| 409 | `EMAIL_TAKEN` | signup with an existing email |
| 409 | `VERSION_CONFLICT` | `version` in PATCH is stale; `details.currentVersion` |
| 409 | `INVALID_STATE` | action not allowed in the current CV / question status |
| 413 | `INPUT_TOO_LARGE` | PDF > 5 MB or > 10 pages |
| 415 | `UNSUPPORTED_FILE` | not a PDF (checked by magic bytes, not by extension) |
| 422 | `PDF_UNREADABLE` | broken PDF or no text layer (scan) |
| 429 | `RATE_LIMITED` | hourly limit; `Retry-After` header (s), `details.limit` |
| 429 | `TOO_MANY_ACTIVE` | already 4 CVs in progress |
| 500 | `DATA_CORRUPT` | stored CV failed schema validation |
| 500 | `INTERNAL` | anything else; generic message, details only in logs |

## Shared types

```ts
type CvStatus = 'queued' | 'generating' | 'retrying' | 'failed' | 'needs_input' | 'ready';
type CvLanguage = 'en' | 'uk' | 'pl' | 'de' | 'fr' | 'es';   // CV_LANGUAGES, architecture.md §6.7
type GenerationStage = 'drafting' | 'verifying' | 'revising' | 'saving';

type CvData = {                                   // architecture.md §6.2
  contacts: { fullName: string | null; email: string | null; phone: string | null;
              location: string | null; links: string[] };              // ≤ 5 links
  summary: string | null;
  experience: { id: string; title: string | null; company: string | null;
                period: string | null; bullets: string[] }[];          // ≤ 10
  projects: { id: string; name: string | null; period: string | null;
              url: string | null; bullets: string[] }[];               // ≤ 6
  education: { id: string; institution: string | null; degree: string | null;
               period: string | null }[];                              // ≤ 6
  certifications: { id: string; name: string | null; issuer: string | null;
                    year: string | null }[];                           // ≤ 10
  skills: string[];                                                    // ≤ 40, no languages
  languages: { id: string; name: string | null; level: string | null }[];   // ≤ 8
  sectionOrder: MovableSection[];   // each of the seven blocks below contacts exactly once
};

type CvSection = 'contacts' | 'summary' | 'experience' | 'projects' | 'education'
  | 'certifications' | 'skills' | 'languages';
type MovableSection = Exclude<CvSection, 'contacts'>;   // contacts is always first
type ItemSection = 'experience' | 'projects' | 'education' | 'certifications' | 'languages';

type Requirement = {                              // architecture.md §7
  id: string; label: string; kind: 'skill' | 'experience'; keywords: string[];
};

type QuestionTarget = {
  section: CvSection;                             // any of the eight blocks
  itemId?: string;                                // an item of an ItemSection only
  field?: string;                                 // e.g. 'period', 'phone', 'level'
};

type Question = {
  id: string;
  kind: 'text' | 'choice' | 'multi' | 'confirm';
  origin: 'model' | 'verifier' | 'auto';
  text: string;
  label: string;                                  // short field name: "Phone", "English"
  options: string[];                              // choice / multi; [] otherwise
  claim: string | null;                           // confirm: the unconfirmed statement
  target: QuestionTarget;
  status: 'open' | 'answered' | 'skipped';
  answer: string | string[] | boolean | null;
};

type CvStatusInfo = {
  id: string;
  status: CvStatus;
  stage: GenerationStage | null;                  // only while generating
  attempt: number;                                // 1-based
  maxAttempts: number;
  queuePosition: number | null;                   // only while queued
  errorCode: string | null;                       // only when failed
  error: string | null;                           // user-facing text
  updatedAt: string;
};

type CvSummary = {                                // list item
  id: string; title: string; targetRole: string; language: CvLanguage; status: CvStatus;
  openQuestions: number;
  match: { covered: number; total: number } | null;   // null until a draft exists
  createdAt: string; updatedAt: string;
};

type Cv = CvStatusInfo & {
  title: string; targetRole: string; roleContext: string | null; language: CvLanguage;
  sourceType: 'text' | 'pdf'; sourceFilename: string | null;
  data: CvData | null;                            // null until the first draft
  version: number;
  requirements: Requirement[];
  suggestedRoles: string[];
  verification: { verified: number; sentToConfirm: number; skillsToConfirm: number;
                  cleared: number } | null;
  questions: Question[];                          // open first, then by position
  createdAt: string;
};
```

`match` in the list is computed on the server with the same `computeMatch` the editor uses;
`sourceText` and `facts` are never returned.

Ids of draft items (`experience`, `projects`, …) are UUIDs **generated by the client** for new
items (`crypto.randomUUID()`); the server checks that each is a UUID and unique within the draft
(`400` otherwise). The same `CvData` schema serves requests and responses.

---

## Health

### `GET /api/health`
`200 { "status": "ok" }` when the API is up and the database answers, `503` otherwise.
No auth. Used by the Docker healthcheck: the worker starts only after it passes.

---

## Auth

### `POST /api/auth/signup`
```json
{ "email": "ann@example.com", "password": "at-least-8-chars" }
```
Email trimmed + lower-cased; password 8–128 chars. `201 { "user": { "id", "email" } }` + cookie.
Errors: `400`, `409 EMAIL_TAKEN`.

### `POST /api/auth/login`
Same body. `200 { "user": … }` + cookie. `401 INVALID_CREDENTIALS`; throttled → `429 RATE_LIMITED`.

### `POST /api/auth/logout`
`204`, clears the cookie. Idempotent, works without a valid cookie.

### `GET /api/auth/me`
`200 { "user": { "id", "email" } }` or `401`. Called by the protected layout loader.

### `GET /api/usage`
```json
{ "generations": { "used": 3, "limit": 10, "resetsAt": "…" },
  "active": { "used": 1, "limit": 4 } }
```
Shown on the New CV screen so the user sees a limit before hitting `429`. `generations.used`
counts what the user started — CVs created and manual retries; automatic retries of a failed
attempt don't count.
The hourly counter uses a sliding window: `used` counts the last 60 minutes, and `resetsAt` is
when the oldest counted event leaves that window, so one more becomes available then (with
`used: 0`, an hour from now). `Retry-After` of a `429 RATE_LIMITED` points at the same moment.

---

## Intake

### `POST /api/ingest/pdf` — extract text, store nothing
`multipart/form-data`, field `file`.

- ≤ 5 MB (`413`), `%PDF` magic bytes (`415`), ≤ 10 pages (`413`), ≥ 50 chars of text (`422`).
- `200`:
  ```json
  { "text": "Olena Hnatiuk\nBackend engineer…", "pages": 2, "chars": 3120,
    "filename": "olena-cv.pdf" }
  ```
- Throttled 20/min. The frontend puts `text` into the background textarea for review.

## CVs

### `POST /api/cvs` — create & start generation
New source:
```json
{ "targetRole": "Senior Backend Engineer",
  "roleContext": "Fintech, Node.js + PostgreSQL, mentoring juniors",
  "language": "en",
  "sourceText": "…", "sourceType": "pdf", "sourceFilename": "olena-cv.pdf" }
```
Another role from an existing CV (suggested-role chip):
```json
{ "targetRole": "Node.js Tech Lead", "roleContext": null, "language": "uk", "fromCvId": "…" }
```

| field | rules |
|---|---|
| `targetRole` | required, trimmed, 2–100 chars |
| `roleContext` | optional, ≤ 5 000 chars: a short note or a pasted vacancy. It describes the role (focus, ordering, requirements) and is never a source of facts about the person |
| `language` | optional, one of `CvLanguage`, default `"en"`; the CV, its questions and PDF headings are in this language; the source may be in any language |
| `sourceText` | 80–20 000 chars — **or** `fromCvId` (own CV with a draft; copies source + user facts); exactly one of the two |
| `sourceType` | `text` (default) \| `pdf` |
| `sourceFilename` | optional, ≤ 200 chars, display only |

`202 { "cv": Cv }` with `status: "queued"`, `data: null`.
Errors: `400 VALIDATION_ERROR` (also `sourceText` over 20 000 chars, in `details.fields`), `404`
(`fromCvId` not own), `409 INVALID_STATE` (`fromCvId` has no draft), `429 RATE_LIMITED`,
`429 TOO_MANY_ACTIVE`. The frontend disables Submit while pending.

### `GET /api/cvs` — list
`200 { "items": CvSummary[] }`, sorted by `updatedAt` desc. No pagination (simplification).

### `GET /api/cvs/statuses?ids=a1,b7` — lightweight polling
`200 { "items": CvStatusInfo[] }` for the requested own CVs in any status (so the client sees the
move out of `generating`). Unknown/foreign ids are silently omitted. 1–50 ids.

```json
{ "items": [
  { "id": "a1", "status": "queued", "stage": null, "attempt": 1, "maxAttempts": 3,
    "queuePosition": 2, "errorCode": null, "error": null, "updatedAt": "…" },
  { "id": "b7", "status": "generating", "stage": "verifying", "attempt": 2, "maxAttempts": 3,
    "queuePosition": null, "errorCode": null, "error": null, "updatedAt": "…" }
] }
```
Client polls every 3 s while any CV `isInProgress`; on a move out of that group it refetches the
list and `GET /api/cvs/:id`.

### `GET /api/cvs/:id`
`200 { "cv": Cv }`.

### `PATCH /api/cvs/:id` — manual edit
```json
{ "version": 4, "title": "Olena — Backend", "data": { /* full CvData */ } }
```
- Status `needs_input` / `ready`, else `409 INVALID_STATE`.
- Body: `version` plus `title` (1–120 chars), `data` or both. A body with neither → `400`.
- `data` replaces the whole document, including `sectionOrder`, and is validated by `CvData`. New
  items carry client-generated UUIDs (see *Shared types*).
- Before it is stored, every item whose fields are all empty is dropped, as are blank bullets,
  skills and links.
- Open questions that target an item no longer in the draft become `skipped`. If no open question
  is left, a `needs_input` CV becomes `ready`, so this endpoint may change the status.
- Filling a field by hand does not close a question about it; only an answer or a skip does.
- `version` ≠ stored → `409 VERSION_CONFLICT`, `details.currentVersion` (UI: "Changed in another
  tab — reload latest").
- `200 { "cv": Cv }` with `version + 1`.

### `DELETE /api/cvs/:id`
`204`, any status. An in-flight generation result is discarded (CAS).

### `POST /api/cvs/:id/retry`
Only from `failed`. Re-queues with stored source and facts, `attempt` reset to 1; counts toward
limits (`429`). `202 { "cv": Cv }`.

### `GET /api/cvs/:id/pdf`
Status `needs_input` / `ready`. `200 application/pdf`,
`Content-Disposition: attachment; filename="<sanitised title>.pdf"`; a title with non-Latin letters
also comes whole in `filename*=UTF-8''…` (the plain `filename` keeps its ASCII part, or "CV"). A4,
selectable text, rendered from the **saved** `data` (the client saves first).

---

## Questions

### `POST /api/cvs/:id/questions/:questionId/answer`
Body depends on the question kind:
```jsonc
{ "kind": "text",    "value": "+380 67 123 45 67" }
{ "kind": "choice",  "value": "B2" }                    // one of options
{ "kind": "choice",  "other": "Native-level Polish" }   // "Other"
{ "kind": "multi",   "values": ["Docker", "PostgreSQL"], "other": "Kafka, gRPC" }
{ "kind": "confirm", "value": true }
```
- CV `needs_input`, question `open` and of that `kind`, else `409 INVALID_STATE`. A question
  whose target no longer exists (its item was removed) → `409 INVALID_STATE`.
- `value`/`other` 1–1 000 chars; `choice` sends `value` (one of `options`) **or** `other`;
  `values` ⊆ `options`, ≥ 1 item unless `other` is given. Otherwise `400`.
  (`answerSchemaFor(question)` in `@cv/shared`.)
- Synchronous (applied as described in [architecture.md §6.5](architecture.md#65-questions--answers));
  the answer goes into the CV as written.
- `200 { "cv": Cv }` — field updated, question `answered`, `version + 1`, status may become `ready`.

### `POST /api/cvs/:id/questions/:questionId/skip`
No body. `text` / `choice` / `multi` only (`confirm` must be answered). Question → `skipped`,
field stays empty. `200 { "cv": Cv }`; status may become `ready`.

---

## Endpoint summary

| method | path | auth | purpose |
|---|---|---|---|
| GET | `/api/health` | – | liveness + database check (Docker healthcheck) |
| POST | `/api/auth/signup` | – | create account, set cookie |
| POST | `/api/auth/login` | – | log in, set cookie |
| POST | `/api/auth/logout` | – | clear cookie |
| GET | `/api/auth/me` | ✓ | current user |
| GET | `/api/usage` | ✓ | limits used / left |
| POST | `/api/ingest/pdf` | ✓ | PDF → text (nothing stored) |
| POST | `/api/cvs` | ✓ | create from text or `fromCvId`, start generation |
| GET | `/api/cvs` | ✓ | list own CVs |
| GET | `/api/cvs/statuses?ids=` | ✓ | poll statuses |
| GET | `/api/cvs/:id` | ✓ | full CV + questions + requirements |
| PATCH | `/api/cvs/:id` | ✓ | manual edit (optimistic version) |
| DELETE | `/api/cvs/:id` | ✓ | delete |
| POST | `/api/cvs/:id/retry` | ✓ | retry failed generation |
| GET | `/api/cvs/:id/pdf` | ✓ | download A4 PDF |
| POST | `/api/cvs/:id/questions/:qid/answer` | ✓ | answer a question |
| POST | `/api/cvs/:id/questions/:qid/skip` | ✓ | skip a question |

Not part of the contract: in development the api also describes itself, the Swagger UI at
`/api/docs` and the OpenAPI document at `/api/docs-json` (`API_DOCS=true`, which `pnpm dev` sets;
off by default, then `404`). Generated from the backend's controllers and the `@cv/shared` schemas;
this file stays the source of truth.
