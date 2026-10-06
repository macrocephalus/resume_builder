import { z } from 'zod'
import { cvDataSchema } from './cv-data'
import { DEFAULT_CV_LANGUAGE, cvLanguageSchema } from './cv-language'
import { CV_STATUSES, GENERATION_STAGES } from './cv-status'
import { questionSchema } from './question'
import { requirementSchema } from './requirement'

// Request and response schemas of docs/api.md. Bodies strip unknown keys, so a `userId` sent by a
// client is ignored.

export const API_LIMITS = {
  password: { min: 8, max: 128 },
  targetRole: { min: 2, max: 100 },
  roleContext: 5000,
  sourceText: { min: 80, max: 20_000 },
  sourceFilename: 200,
  title: { min: 1, max: 120 },
  /** ids per `GET /api/cvs/statuses` */
  statusIds: 50,
  pdf: { bytes: 5 * 1024 * 1024, pages: 10, minChars: 50 },
} as const

// --- Errors ---

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'VERSION_CONFLICT',
  'INVALID_STATE',
  'INPUT_TOO_LARGE',
  'UNSUPPORTED_FILE',
  'PDF_UNREADABLE',
  'RATE_LIMITED',
  'TOO_MANY_ACTIVE',
  'DATA_CORRUPT',
  'INTERNAL',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

/** Every non-2xx JSON response. `details` depends on the code (`fields`, `currentVersion`, `limit`). */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).default({}),
  }),
})
export type ErrorResponse = z.infer<typeof errorResponseSchema>

const timestamp = z.iso.datetime({ offset: true })
const id = z.uuid()

// --- Health ---

export const healthResponseSchema = z.object({ status: z.literal('ok') })

// --- Auth ---

/** Body of signup and login. The email is trimmed and lower-cased. */
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(API_LIMITS.password.min).max(API_LIMITS.password.max),
})
export type Credentials = z.infer<typeof credentialsSchema>

export const userSchema = z.object({ id, email: z.string() })
export type User = z.infer<typeof userSchema>

/** Response of signup, login and me. */
export const userResponseSchema = z.object({ user: userSchema })

// --- Usage ---

const counter = z.object({ used: z.int().nonnegative(), limit: z.int().positive() })
const hourlyCounter = counter.extend({ resetsAt: timestamp })

export const usageResponseSchema = z.object({
  generations: hourlyCounter,
  active: counter,
})
export type Usage = z.infer<typeof usageResponseSchema>

// --- Intake ---

export const ingestPdfResponseSchema = z.object({
  text: z.string(),
  pages: z.int().positive(),
  chars: z.int().nonnegative(),
  filename: z.string(),
})
export type IngestedPdf = z.infer<typeof ingestPdfResponseSchema>

// --- CVs ---

export const SOURCE_TYPES = ['text', 'pdf'] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

/** The light part of a CV, polled while it is in progress. */
export const cvStatusInfoSchema = z.object({
  id,
  status: z.enum(CV_STATUSES),
  /** only while generating */
  stage: z.enum(GENERATION_STAGES).nullable(),
  /** 1-based */
  attempt: z.int().positive(),
  maxAttempts: z.int().positive(),
  /** only while queued */
  queuePosition: z.int().positive().nullable(),
  /** only when failed */
  errorCode: z.string().nullable(),
  /** user-facing text */
  error: z.string().nullable(),
  updatedAt: timestamp,
})
export type CvStatusInfo = z.infer<typeof cvStatusInfoSchema>

export const verificationSchema = z.object({
  verified: z.int().nonnegative(),
  sentToConfirm: z.int().nonnegative(),
  skillsToConfirm: z.int().nonnegative(),
  cleared: z.int().nonnegative(),
})

export const cvSchema = cvStatusInfoSchema.extend({
  title: z.string(),
  targetRole: z.string(),
  roleContext: z.string().nullable(),
  language: cvLanguageSchema,
  sourceType: z.enum(SOURCE_TYPES),
  sourceFilename: z.string().nullable(),
  /** null until the first draft */
  data: cvDataSchema.nullable(),
  version: z.int().nonnegative(),
  requirements: z.array(requirementSchema),
  suggestedRoles: z.array(z.string()),
  verification: verificationSchema.nullable(),
  /** open first, then by position */
  questions: z.array(questionSchema),
  createdAt: timestamp,
})
export type Cv = z.infer<typeof cvSchema>

/** An item of the CV list. */
export const cvSummarySchema = z.object({
  id,
  title: z.string(),
  targetRole: z.string(),
  language: cvLanguageSchema,
  status: z.enum(CV_STATUSES),
  openQuestions: z.int().nonnegative(),
  /** null until a draft exists */
  match: z.object({ covered: z.int().nonnegative(), total: z.int().nonnegative() }).nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
})
export type CvSummary = z.infer<typeof cvSummarySchema>

/** Response of every endpoint that returns one CV. */
export const cvResponseSchema = z.object({ cv: cvSchema })

export const cvListResponseSchema = z.object({ items: z.array(cvSummarySchema) })

/** `?ids=a1,b7`: 1–50 comma-separated ids. */
export const cvStatusesQuerySchema = z.object({
  ids: z
    .string()
    .transform((value) => value.split(',').map((part) => part.trim()).filter((part) => part !== ''))
    .pipe(z.array(id).min(1).max(API_LIMITS.statusIds)),
})

export const cvStatusesResponseSchema = z.object({ items: z.array(cvStatusInfoSchema) })

/**
 * Body of `POST /api/cvs`: a new source (`sourceText`) or another role for an existing CV
 * (`fromCvId`), exactly one of the two.
 */
export const createCvBodySchema = z
  .object({
    targetRole: z.string().trim().min(API_LIMITS.targetRole.min).max(API_LIMITS.targetRole.max),
    roleContext: z.string().trim().max(API_LIMITS.roleContext).nullish(),
    language: cvLanguageSchema.default(DEFAULT_CV_LANGUAGE),
    sourceText: z.string().trim().min(API_LIMITS.sourceText.min).max(API_LIMITS.sourceText.max).optional(),
    sourceType: z.enum(SOURCE_TYPES).default('text'),
    sourceFilename: z.string().max(API_LIMITS.sourceFilename).nullish(),
    fromCvId: id.optional(),
  })
  .refine((body) => (body.sourceText === undefined) !== (body.fromCvId === undefined), {
    error: 'Send either sourceText or fromCvId',
    path: ['sourceText'],
  })
export type CreateCvBody = z.infer<typeof createCvBodySchema>

/** Body of `PATCH /api/cvs/:id`: the version it was edited from, and a new title, a new draft or both. */
export const patchCvBodySchema = z
  .object({
    version: z.int().nonnegative(),
    title: z.string().trim().min(API_LIMITS.title.min).max(API_LIMITS.title.max).optional(),
    data: cvDataSchema.optional(),
  })
  .refine((body) => body.title !== undefined || body.data !== undefined, {
    error: 'Send a title, a draft or both',
  })
export type PatchCvBody = z.infer<typeof patchCvBodySchema>
