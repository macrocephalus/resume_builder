import { z } from 'zod'

export const REQUIREMENT_KINDS = ['skill', 'experience'] as const
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number]

export const REQUIREMENT_LIMITS = {
  /** requirements per CV */
  count: 12,
  label: 100,
  keywords: 10,
  keyword: 60,
} as const

/**
 * What the target role asks for. Requirements describe the role, not the person, so they are only
 * bounded, never fact-checked. Keywords are matched against the CV text by `computeMatch`.
 */
export const requirementSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1).max(REQUIREMENT_LIMITS.label),
  kind: z.enum(REQUIREMENT_KINDS),
  keywords: z.array(z.string().min(1).max(REQUIREMENT_LIMITS.keyword)).min(1).max(REQUIREMENT_LIMITS.keywords),
})

export type Requirement = z.infer<typeof requirementSchema>
