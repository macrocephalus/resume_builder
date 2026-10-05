import { z } from 'zod'
import { CV_SECTIONS, ITEM_SECTIONS } from './cv-data'

export const QUESTION_KINDS = ['text', 'choice', 'multi', 'confirm'] as const
export type QuestionKind = (typeof QUESTION_KINDS)[number]

export const QUESTION_ORIGINS = ['model', 'verifier', 'auto'] as const
export type QuestionOrigin = (typeof QUESTION_ORIGINS)[number]

export const QUESTION_STATUSES = ['open', 'answered', 'skipped'] as const
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]

/** Kinds the user may skip; a `confirm` question must be answered yes or no. */
export const SKIPPABLE_KINDS = ['text', 'choice', 'multi'] as const satisfies readonly QuestionKind[]

export const ANSWER_LIMITS = {
  /** `value` and `other` of every kind */
  text: 1000,
} as const

/**
 * The part of the draft a question is about. `itemId` points at one item of an item block;
 * `field` names a field of the block or of that item (`phone`, `period`).
 */
export const questionTargetSchema = z
  .object({
    section: z.enum(CV_SECTIONS),
    itemId: z.uuid().optional(),
    field: z.string().min(1).max(60).optional(),
  })
  .refine(
    (target) => target.itemId === undefined || (ITEM_SECTIONS as readonly string[]).includes(target.section),
    { error: 'Only experience, projects, education, certifications and languages have items', path: ['itemId'] },
  )

export type QuestionTarget = z.infer<typeof questionTargetSchema>

export const questionSchema = z.object({
  id: z.uuid(),
  kind: z.enum(QUESTION_KINDS),
  origin: z.enum(QUESTION_ORIGINS),
  text: z.string(),
  /** Short field name: "Phone", "English". */
  label: z.string(),
  /** `choice` / `multi`; empty otherwise. */
  options: z.array(z.string()),
  /** `confirm`: the statement the source does not back up. */
  claim: z.string().nullable(),
  target: questionTargetSchema,
  status: z.enum(QUESTION_STATUSES),
  answer: z.union([z.string(), z.array(z.string()), z.boolean()]).nullable(),
})

export type Question = z.infer<typeof questionSchema>

const answerText = z.string().trim().min(1).max(ANSWER_LIMITS.text)

export const textAnswerSchema = z.object({ kind: z.literal('text'), value: answerText })

/** One of the options, or "Other" with the user's own text. */
export const choiceAnswerSchema = z
  .object({ kind: z.literal('choice'), value: answerText.optional(), other: answerText.optional() })
  .refine((answer) => (answer.value === undefined) !== (answer.other === undefined), {
    error: 'Pick one option or fill in "Other", not both',
  })

/** Ticked options and / or "Other" with the user's own text; at least one of them. */
export const multiAnswerSchema = z
  .object({ kind: z.literal('multi'), values: z.array(answerText).default([]), other: answerText.optional() })
  .refine((answer) => answer.values.length > 0 || answer.other !== undefined, {
    error: 'Tick at least one option or fill in "Other"',
    path: ['values'],
  })

export const confirmAnswerSchema = z.object({ kind: z.literal('confirm'), value: z.boolean() })

/** Body of `POST /api/cvs/:id/questions/:questionId/answer`. */
export const answerSchema = z.discriminatedUnion('kind', [
  textAnswerSchema,
  choiceAnswerSchema,
  multiAnswerSchema,
  confirmAnswerSchema,
])

export type Answer = z.infer<typeof answerSchema>

/**
 * The answer schema for one question: its kind only, and a picked `value` / `values` must be among
 * its options. The server checks the body with it; a form can validate with it before sending.
 */
export const answerSchemaFor = (question: Pick<Question, 'kind' | 'options'>) => {
  const inOptions = (value: string) => question.options.includes(value)
  return answerSchema.superRefine((answer, ctx) => {
    if (answer.kind !== question.kind) {
      ctx.addIssue({ code: 'custom', message: `This question takes a "${question.kind}" answer`, path: ['kind'] })
      return
    }
    if (answer.kind === 'choice' && answer.value !== undefined && !inOptions(answer.value)) {
      ctx.addIssue({ code: 'custom', message: 'Not one of the options', path: ['value'] })
    }
    if (answer.kind === 'multi') {
      answer.values.forEach((value, index) => {
        if (!inOptions(value)) ctx.addIssue({ code: 'custom', message: 'Not one of the options', path: ['values', index] })
      })
    }
  })
}
