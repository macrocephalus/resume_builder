# REST API

> Це переклад `docs/api.md`; першоджерелом є англійська версія.
> Статус: **чернетка на розгляді** — частина набору проєктної документації
> [architecture.md](architecture.md) · api.md (цей файл) · [cv-statuses.md](cv-statuses.md).
> Схеми запитів і відповідей описано в пакеті `@cv/shared` (`shared/src/api.ts`, поруч — схеми
> чернетки, запитань і вимог; Zod); їх використовують обидва застосунки.

## Домовленості

- Базовий шлях `/api`, той самий origin, що й у SPA (проксі nginx / Vite). На вході й на виході —
  JSON, крім `POST /api/ingest/pdf` (multipart) і `GET /api/cvs/:id/pdf` (бінарні дані).
- **Автентифікація:** JWT у cookie з прапорцем `httpOnly`, яку встановлюють signup/login; фронтенд
  ніколи не бачить токена. Вона потрібна для всього, крім `signup`/`login` і `health` → `401 UNAUTHORIZED`.
- Резюме, яке не існує **або належить іншому користувачеві** → `404 NOT_FOUND` (ніколи не `403`).
- Ідентифікатори — UUID. Мітки часу — ISO-8601 в UTC; фронтенд форматує їх відповідно до локалі
  пристрою.
- Тіла запитів розбираються за допомогою Zod; невідомі ключі відкидаються (`userId` у тілі
  ігнорується).
- Дії, не дозволені в поточному статусі резюме → `409 INVALID_STATE` — повна таблиця в
  [cv-statuses.md §3](cv-statuses.md#3-дозволені-дії-за-статусом).

### Помилки

```json
{ "error": { "code": "VERSION_CONFLICT", "message": "Резюме було змінено в іншому місці.", "details": {} } }
```

| HTTP | код | коли |
|---|---|---|
| 400 | `VALIDATION_ERROR` | невалідне тіло / query-параметри; `details.fields`: `{ "targetRole": "Required" }` |
| 401 | `UNAUTHORIZED` | cookie відсутня, недійсна або прострочена |
| 401 | `INVALID_CREDENTIALS` | невдалий вхід (однаково для невідомого email і неправильного пароля) |
| 404 | `NOT_FOUND` | не існує або належить іншому користувачеві (резюме чи запитання) |
| 409 | `EMAIL_TAKEN` | реєстрація з уже зайнятим email |
| 409 | `VERSION_CONFLICT` | `version` у PATCH застаріла; `details.currentVersion` |
| 409 | `INVALID_STATE` | дія не дозволена в поточному статусі резюме / запитання |
| 413 | `INPUT_TOO_LARGE` | PDF > 5 МБ або > 10 сторінок |
| 415 | `UNSUPPORTED_FILE` | не PDF (перевіряється за сигнатурою — magic bytes, а не за розширенням) |
| 422 | `PDF_UNREADABLE` | пошкоджений PDF або немає текстового шару (скан) |
| 429 | `RATE_LIMITED` | погодинний ліміт; заголовок `Retry-After` (у секундах), `details.limit` |
| 429 | `TOO_MANY_ACTIVE` | уже 4 резюме в процесі генерації |
| 500 | `DATA_CORRUPT` | збережене резюме не пройшло валідацію схеми |
| 500 | `INTERNAL` | усе інше; загальне повідомлення, подробиці лише в логах |

## Спільні типи

```ts
type CvStatus = 'queued' | 'generating' | 'retrying' | 'failed' | 'needs_input' | 'ready';
type CvLanguage = 'en' | 'uk' | 'pl' | 'de' | 'fr' | 'es';   // CV_LANGUAGES, architecture.md §6.7
type GenerationStage = 'drafting' | 'verifying' | 'revising' | 'saving';

type CvData = {                                   // architecture.md §6.2
  contacts: { fullName: string | null; email: string | null; phone: string | null;
              location: string | null; links: string[] };              // ≤ 5 посилань
  summary: string | null;
  experience: { id: string; title: string | null; company: string | null;
                period: string | null; bullets: string[] }[];          // ≤ 10
  projects: { id: string; name: string | null; period: string | null;
              url: string | null; bullets: string[] }[];               // ≤ 6
  education: { id: string; institution: string | null; degree: string | null;
               period: string | null }[];                              // ≤ 6
  certifications: { id: string; name: string | null; issuer: string | null;
                    year: string | null }[];                           // ≤ 10
  skills: string[];                                                    // ≤ 40, без мов
  languages: { id: string; name: string | null; level: string | null }[];   // ≤ 8
  sectionOrder: MovableSection[];   // кожен із семи блоків під contacts рівно раз
};

type CvSection = 'contacts' | 'summary' | 'experience' | 'projects' | 'education'
  | 'certifications' | 'skills' | 'languages';
type MovableSection = Exclude<CvSection, 'contacts'>;   // contacts завжди перший
type ItemSection = 'experience' | 'projects' | 'education' | 'certifications' | 'languages';

type Requirement = {                              // architecture.md §7
  id: string; label: string; kind: 'skill' | 'experience'; keywords: string[];
};

type QuestionTarget = {
  section: CvSection;                             // будь-який із восьми блоків
  itemId?: string;                                // лише елемент ItemSection
  field?: string;                                 // напр. 'period', 'phone', 'level'
};

type Question = {
  id: string;
  kind: 'text' | 'choice' | 'multi' | 'confirm';
  origin: 'model' | 'verifier' | 'auto';
  text: string;
  label: string;                                  // коротка назва поля: "Phone", "English"
  options: string[];                              // choice / multi; інакше []
  claim: string | null;                           // confirm: непідтверджене твердження
  target: QuestionTarget;
  status: 'open' | 'answered' | 'skipped';
  answer: string | string[] | boolean | null;
};

type CvStatusInfo = {
  id: string;
  status: CvStatus;
  stage: GenerationStage | null;                  // лише під час generating
  attempt: number;                                // нумерація з 1
  maxAttempts: number;
  queuePosition: number | null;                   // лише в статусі queued
  errorCode: string | null;                       // лише в статусі failed
  error: string | null;                           // текст для користувача
  updatedAt: string;
};

type CvSummary = {                                // елемент списку
  id: string; title: string; targetRole: string; language: CvLanguage; status: CvStatus;
  openQuestions: number;
  match: { covered: number; total: number } | null;   // null, доки немає чернетки
  createdAt: string; updatedAt: string;
};

type Cv = CvStatusInfo & {
  title: string; targetRole: string; roleContext: string | null; language: CvLanguage;
  sourceType: 'text' | 'pdf'; sourceFilename: string | null;
  data: CvData | null;                            // null до першої чернетки
  version: number;
  requirements: Requirement[];
  suggestedRoles: string[];
  verification: { verified: number; sentToConfirm: number; skillsToConfirm: number;
                  cleared: number } | null;
  questions: Question[];                          // спочатку open, далі за позицією
  createdAt: string;
};
```

`match` у списку обчислюється на сервері тією самою функцією `computeMatch`, що й у редакторі;
`sourceText` і `facts` ніколи не повертаються.

Id елементів чернетки (`experience`, `projects`, …) для нових елементів **генерує клієнт**
(`crypto.randomUUID()`); сервер перевіряє, що кожен — UUID і унікальний у межах чернетки (інакше
`400`). Та сама схема `CvData` описує і запити, і відповіді.

---

## Health

### `GET /api/health`
`200 { "status": "ok" }`, коли API працює і база даних відповідає, інакше `503`.
Без автентифікації. Використовується в healthcheck Docker: worker стартує лише після нього.

---

## Автентифікація

### `POST /api/auth/signup`
```json
{ "email": "ann@example.com", "password": "at-least-8-chars" }
```
Email очищується від пробілів на краях і переводиться в нижній регістр; пароль — 8–128 символів.
`201 { "user": { "id", "email" } }` + cookie.
Помилки: `400`, `409 EMAIL_TAKEN`.

### `POST /api/auth/login`
Те саме тіло. `200 { "user": … }` + cookie. `401 INVALID_CREDENTIALS`; у разі перевищення частоти
запитів → `429 RATE_LIMITED`.

### `POST /api/auth/logout`
`204`, очищає cookie. Ідемпотентний, працює й без дійсної cookie.

### `GET /api/auth/me`
`200 { "user": { "id", "email" } }` або `401`. Викликається лоадером захищеного лейауту.

### `GET /api/usage`
```json
{ "generations": { "used": 3, "limit": 10, "resetsAt": "…" },
  "active": { "used": 1, "limit": 2 } }
```
Показується на екрані «Нове резюме», щоб користувач бачив ліміт ще до того, як отримає `429`.
`generations.used` рахує те, що запустив користувач, — створені CV і ручні повтори; автоматичні
повтори невдалої спроби не рахуються.
Погодинний лічильник рахує ковзне вікно: `used` — це останні 60 хвилин, а `resetsAt` — момент,
коли найстаріша врахована подія виходить із цього вікна, тож тоді звільняється ще одна (за
`used: 0` — через годину від зараз). `Retry-After` у `429 RATE_LIMITED` вказує на той самий момент.

---

## Вхідні дані

### `POST /api/ingest/pdf` — витягти текст, нічого не зберігаючи
`multipart/form-data`, поле `file`.

- ≤ 5 МБ (`413`), сигнатура `%PDF` (`415`), ≤ 10 сторінок (`413`), ≥ 50 символів тексту (`422`).
- `200`:
  ```json
  { "text": "Olena Hnatiuk\nBackend engineer…", "pages": 2, "chars": 3120,
    "filename": "olena-cv.pdf" }
  ```
- Обмеження частоти — 20/хв. Фронтенд вставляє `text` у текстове поле з описом досвіду, щоб
  користувач його переглянув.

## Резюме

### `POST /api/cvs` — створення й запуск генерації
Нове джерело:
```json
{ "targetRole": "Senior Backend Engineer",
  "roleContext": "Fintech, Node.js + PostgreSQL, mentoring juniors",
  "language": "en",
  "sourceText": "…", "sourceType": "pdf", "sourceFilename": "olena-cv.pdf" }
```
Інша роль на основі наявного резюме (чип запропонованої ролі):
```json
{ "targetRole": "Node.js Tech Lead", "roleContext": null, "language": "uk", "fromCvId": "…" }
```

| поле | правила |
|---|---|
| `targetRole` | обов'язкове, пробіли на краях обрізаються, 2–100 символів |
| `roleContext` | необов'язкове, ≤ 5 000 символів: коротка нотатка або вставлена вакансія. Описує роль (фокус, порядок, вимоги) і ніколи не є джерелом фактів про людину |
| `language` | необов'язкове, одне зі значень `CvLanguage`, за замовчуванням `"en"`; резюме, його запитання й заголовки PDF — цією мовою; джерело може бути будь-якою мовою |
| `sourceText` | 80–20 000 символів — **або** `fromCvId` (власне резюме з чернеткою; копіюються джерело + факти від користувача); рівно одне з двох |
| `sourceType` | `text` (за замовчуванням) \| `pdf` |
| `sourceFilename` | необов'язкове, ≤ 200 символів, лише для відображення |

`202 { "cv": Cv }` зі `status: "queued"`, `data: null`.
Помилки: `400 VALIDATION_ERROR` (зокрема `sourceText` довший за 20 000 символів, у `details.fields`),
`404` (`fromCvId` не належить користувачеві), `409 INVALID_STATE` (у `fromCvId` немає чернетки),
`429 RATE_LIMITED`, `429 TOO_MANY_ACTIVE`. Поки запит виконується,
фронтенд блокує кнопку Submit.

### `GET /api/cvs` — список
`200 { "items": CvSummary[] }`, відсортовано за `updatedAt` за спаданням. Без пагінації (спрощення).

### `GET /api/cvs/statuses?ids=a1,b7` — легке опитування (polling)
`200 { "items": CvStatusInfo[] }` для запитаних власних резюме в будь-якому статусі (щоб клієнт
побачив вихід зі стану `generating`). Невідомі / чужі id мовчки пропускаються. Від 1 до 50 id.

```json
{ "items": [
  { "id": "a1", "status": "queued", "stage": null, "attempt": 1, "maxAttempts": 3,
    "queuePosition": 2, "errorCode": null, "error": null, "updatedAt": "…" },
  { "id": "b7", "status": "generating", "stage": "verifying", "attempt": 2, "maxAttempts": 3,
    "queuePosition": null, "errorCode": null, "error": null, "updatedAt": "…" }
] }
```
Клієнт опитує сервер кожні 3 с, поки хоча б одне резюме `isInProgress`; коли резюме виходить
із цієї групи, він повторно завантажує список і `GET /api/cvs/:id`.

### `GET /api/cvs/:id`
`200 { "cv": Cv }`.

### `PATCH /api/cvs/:id` — ручне редагування
```json
{ "version": 4, "title": "Olena — Backend", "data": { /* повний CvData */ } }
```
- Статус `needs_input` / `ready`, інакше `409 INVALID_STATE`.
- Тіло: `version` плюс `title` (1–120 символів), `data` або обидва. Тіло без жодного з них → `400`.
- `data` повністю замінює документ, разом із `sectionOrder`, і валідується за `CvData`. Нові
  елементи мають UUID, згенеровані клієнтом (див. *Спільні типи*).
- Перед збереженням відкидаються елементи, у яких усі поля порожні, а також порожні пункти,
  навички й посилання.
- Відкриті запитання, ціль яких — елемент, якого вже немає в чернетці, стають `skipped`. Якщо
  відкритих запитань не лишилося, резюме зі статусом `needs_input` стає `ready`, тож цей запит
  може змінити статус.
- Ручне заповнення поля не закриває запитання про нього; закриває лише відповідь або пропуск.
- `version` ≠ збереженій → `409 VERSION_CONFLICT`, `details.currentVersion` (UI: «Змінено в
  іншій вкладці — завантажте актуальну версію»).
- `200 { "cv": Cv }` з `version + 1`.

### `DELETE /api/cvs/:id`
`204`, у будь-якому статусі. Результат генерації, що саме виконується, відкидається (CAS).

### `POST /api/cvs/:id/retry`
Лише зі статусу `failed`. Повторно ставить у чергу зі збереженими джерелом і фактами, `attempt`
скидається до 1; враховується в лімітах (`429`). `202 { "cv": Cv }`.

### `GET /api/cvs/:id/pdf`
Статус `needs_input` / `ready`. `200 application/pdf`,
`Content-Disposition: attachment; filename="<sanitised title>.pdf"`; назва з нелатинськими літерами
додатково приходить повністю у `filename*=UTF-8''…` (звичайний `filename` зберігає її ASCII-частину
або "CV"). Формат A4, текст можна виділяти, рендериться зі **збереженого** `data` (клієнт спершу
зберігає зміни).

---

## Запитання

### `POST /api/cvs/:id/questions/:questionId/answer`
Тіло залежить від типу запитання:
```jsonc
{ "kind": "text",    "value": "+380 67 123 45 67" }
{ "kind": "choice",  "value": "B2" }                    // одне з options
{ "kind": "choice",  "other": "Native-level Polish" }   // варіант «Інше»
{ "kind": "multi",   "values": ["Docker", "PostgreSQL"], "other": "Kafka, gRPC" }
{ "kind": "confirm", "value": true }
```
- Резюме в статусі `needs_input`, запитання в статусі `open` і саме цього `kind`, інакше
  `409 INVALID_STATE`. Запитання, ціль якого вже не існує (його елемент видалено) →
  `409 INVALID_STATE`.
- `value`/`other` 1–1 000 символів; `choice` надсилає `value` (одне з `options`) **або** `other`;
  `values` ⊆ `options`, ≥ 1 елемент, якщо не задано `other`. Інакше `400`.
  (`answerSchemaFor(question)` у `@cv/shared`.)
- Синхронний запит (зміни застосовуються, як описано в
  [architecture.md §6.5](architecture.md#65-питання-та-відповіді)); відповідь потрапляє в CV як є.
- `200 { "cv": Cv }` — поле оновлено, запитання `answered`, `version + 1`, статус може стати `ready`.

### `POST /api/cvs/:id/questions/:questionId/skip`
Без тіла. Лише `text` / `choice` / `multi` (на `confirm` потрібно відповісти). Запитання →
`skipped`, поле лишається порожнім. `200 { "cv": Cv }`; статус може стати `ready`.

---

## Зведення ендпоінтів

| метод | шлях | автентифікація | призначення |
|---|---|---|---|
| GET | `/api/health` | – | перевірка, що API живий і база відповідає (healthcheck Docker) |
| POST | `/api/auth/signup` | – | створити акаунт, встановити cookie |
| POST | `/api/auth/login` | – | увійти, встановити cookie |
| POST | `/api/auth/logout` | – | очистити cookie |
| GET | `/api/auth/me` | ✓ | поточний користувач |
| GET | `/api/usage` | ✓ | використані / залишкові ліміти |
| POST | `/api/ingest/pdf` | ✓ | PDF → текст (нічого не зберігається) |
| POST | `/api/cvs` | ✓ | створити з тексту або `fromCvId`, запустити генерацію |
| GET | `/api/cvs` | ✓ | список власних резюме |
| GET | `/api/cvs/statuses?ids=` | ✓ | опитування статусів |
| GET | `/api/cvs/:id` | ✓ | повне резюме + запитання + вимоги |
| PATCH | `/api/cvs/:id` | ✓ | ручне редагування (оптимістичне версіонування) |
| DELETE | `/api/cvs/:id` | ✓ | видалити |
| POST | `/api/cvs/:id/retry` | ✓ | повторити невдалу генерацію |
| GET | `/api/cvs/:id/pdf` | ✓ | завантажити PDF формату A4 |
| POST | `/api/cvs/:id/questions/:qid/answer` | ✓ | відповісти на запитання |
| POST | `/api/cvs/:id/questions/:qid/skip` | ✓ | пропустити запитання |
