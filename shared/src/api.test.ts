import { describe, expect, it } from 'vitest'
import {
  createCvBodySchema,
  credentialsSchema,
  cvResponseSchema,
  cvStatusesQuerySchema,
  errorResponseSchema,
  patchCvBodySchema,
} from './index'
import { fullDraft, ids } from './testing/draft'

const source = 'Backend engineer with six years of Node.js and PostgreSQL. '.repeat(2)

describe('create CV body', () => {
  const accepts = (body: unknown) => createCvBodySchema.safeParse(body).success

  it('takes a new source and fills the defaults', () => {
    expect(createCvBodySchema.parse({ targetRole: ' Senior Backend Engineer ', sourceText: source })).toEqual({
      targetRole: 'Senior Backend Engineer',
      language: 'en',
      sourceText: source.trim(),
      sourceType: 'text',
    })
  })

  it('takes another role for an existing CV', () => {
    expect(accepts({ targetRole: 'Node.js Tech Lead', roleContext: null, language: 'uk', fromCvId: ids.other })).toBe(true)
  })

  it('needs exactly one of sourceText and fromCvId', () => {
    expect(accepts({ targetRole: 'Node.js Tech Lead' })).toBe(false)
    expect(accepts({ targetRole: 'Node.js Tech Lead', sourceText: source, fromCvId: ids.other })).toBe(false)
  })

  it('keeps the source between 80 and 20 000 chars', () => {
    expect(accepts({ targetRole: 'Backend', sourceText: 'a'.repeat(79) })).toBe(false)
    expect(accepts({ targetRole: 'Backend', sourceText: 'a'.repeat(80) })).toBe(true)
    expect(accepts({ targetRole: 'Backend', sourceText: 'a'.repeat(20_001) })).toBe(false)
  })

  it('takes role context up to 5 000 chars', () => {
    expect(accepts({ targetRole: 'Backend', sourceText: source, roleContext: 'a'.repeat(5000) })).toBe(true)
    expect(accepts({ targetRole: 'Backend', sourceText: source, roleContext: 'a'.repeat(5001) })).toBe(false)
  })

  it('rejects a role shorter than 2 chars and a language outside the list', () => {
    expect(accepts({ targetRole: ' x ', sourceText: source })).toBe(false)
    expect(accepts({ targetRole: 'Backend', sourceText: source, language: 'ru' })).toBe(false)
  })

  it('ignores a user id sent by the client', () => {
    expect(createCvBodySchema.parse({ targetRole: 'Backend', sourceText: source, userId: ids.other })).not.toHaveProperty(
      'userId',
    )
  })
})

describe('PATCH CV body', () => {
  const accepts = (body: unknown) => patchCvBodySchema.safeParse(body).success

  it('takes a title, a draft or both', () => {
    expect(accepts({ version: 4, title: 'Olena — Backend' })).toBe(true)
    expect(accepts({ version: 4, data: fullDraft() })).toBe(true)
    expect(accepts({ version: 4, title: 'Olena — Backend', data: fullDraft() })).toBe(true)
  })

  it('rejects a body with neither a title nor a draft', () => {
    expect(accepts({ version: 4 })).toBe(false)
  })

  it('needs the version it was edited from', () => {
    expect(accepts({ title: 'Olena — Backend' })).toBe(false)
  })

  it('rejects a blank title and one over 120 chars', () => {
    expect(accepts({ version: 4, title: '   ' })).toBe(false)
    expect(accepts({ version: 4, title: 'a'.repeat(121) })).toBe(false)
  })

  it('rejects new items without a client-generated UUID', () => {
    const data = fullDraft()
    data.experience.push({ id: 'new', title: 'Intern', company: null, period: null, bullets: [] })
    expect(accepts({ version: 4, data })).toBe(false)
  })
})

describe('credentials', () => {
  it('trims and lower-cases the email', () => {
    expect(credentialsSchema.parse({ email: ' Ann@Example.com ', password: 'at-least-8' }).email).toBe('ann@example.com')
  })

  it('keeps the password between 8 and 128 chars', () => {
    expect(credentialsSchema.safeParse({ email: 'ann@example.com', password: 'a'.repeat(7) }).success).toBe(false)
    expect(credentialsSchema.safeParse({ email: 'ann@example.com', password: 'a'.repeat(129) }).success).toBe(false)
  })

  it('rejects an invalid email', () => {
    expect(credentialsSchema.safeParse({ email: 'ann', password: 'at-least-8' }).success).toBe(false)
  })
})

describe('statuses query', () => {
  it('splits the ids', () => {
    expect(cvStatusesQuerySchema.parse({ ids: `${ids.job},${ids.project}` }).ids).toEqual([ids.job, ids.project])
  })

  it('takes 1 to 50 UUIDs', () => {
    expect(cvStatusesQuerySchema.safeParse({ ids: '' }).success).toBe(false)
    expect(cvStatusesQuerySchema.safeParse({ ids: 'a1,b7' }).success).toBe(false)
    expect(cvStatusesQuerySchema.safeParse({ ids: Array(51).fill(ids.job).join(',') }).success).toBe(false)
  })
})

describe('responses', () => {
  it('parses the error envelope and defaults its details', () => {
    expect(errorResponseSchema.parse({ error: { code: 'EMAIL_TAKEN', message: 'Taken.' } })).toEqual({
      error: { code: 'EMAIL_TAKEN', message: 'Taken.', details: {} },
    })
  })

  it('rejects an error code outside the contract', () => {
    expect(errorResponseSchema.safeParse({ error: { code: 'TEAPOT', message: '' } }).success).toBe(false)
  })

  it('parses a queued CV without a draft', () => {
    const cv = {
      id: ids.other,
      status: 'queued',
      stage: null,
      attempt: 1,
      maxAttempts: 3,
      queuePosition: 2,
      errorCode: null,
      error: null,
      updatedAt: '2026-10-05T12:00:00.000Z',
      title: 'Senior Backend Engineer',
      targetRole: 'Senior Backend Engineer',
      roleContext: null,
      language: 'en',
      sourceType: 'text',
      sourceFilename: null,
      data: null,
      version: 0,
      requirements: [],
      suggestedRoles: [],
      verification: null,
      questions: [],
      createdAt: '2026-10-05T12:00:00.000Z',
    }
    expect(cvResponseSchema.safeParse({ cv }).success).toBe(true)
    expect(cvResponseSchema.safeParse({ cv: { ...cv, status: 'done' } }).success).toBe(false)
  })
})
