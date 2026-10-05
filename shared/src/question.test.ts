import { describe, expect, it } from 'vitest'
import { answerSchema, answerSchemaFor, questionSchema, questionTargetSchema, type Question } from './index'
import { ids } from './testing/draft'

const accepts = (body: unknown) => answerSchema.safeParse(body).success

describe('answer to a question', () => {
  describe('text', () => {
    it('takes a value and trims it', () => {
      expect(answerSchema.parse({ kind: 'text', value: '  +380 67 123 45 67 ' })).toEqual({
        kind: 'text',
        value: '+380 67 123 45 67',
      })
    })

    it('rejects an empty value and one over 1 000 chars', () => {
      expect(accepts({ kind: 'text', value: '   ' })).toBe(false)
      expect(accepts({ kind: 'text', value: 'a'.repeat(1001) })).toBe(false)
      expect(accepts({ kind: 'text', value: 'a'.repeat(1000) })).toBe(true)
    })
  })

  describe('choice', () => {
    it('takes one option', () => {
      expect(accepts({ kind: 'choice', value: 'B2' })).toBe(true)
    })

    it('takes "Other" with the user\'s own text', () => {
      expect(accepts({ kind: 'choice', other: 'Native-level Polish' })).toBe(true)
    })

    it('rejects both an option and "Other", and neither', () => {
      expect(accepts({ kind: 'choice', value: 'B2', other: 'C1' })).toBe(false)
      expect(accepts({ kind: 'choice' })).toBe(false)
    })
  })

  describe('multi', () => {
    it('takes ticked options, "Other", or both', () => {
      expect(accepts({ kind: 'multi', values: ['Docker', 'PostgreSQL'] })).toBe(true)
      expect(accepts({ kind: 'multi', values: [], other: 'Kafka, gRPC' })).toBe(true)
      expect(accepts({ kind: 'multi', other: 'Kafka' })).toBe(true)
      expect(accepts({ kind: 'multi', values: ['Docker'], other: 'Kafka' })).toBe(true)
    })

    it('rejects nothing ticked and no "Other"', () => {
      expect(accepts({ kind: 'multi', values: [] })).toBe(false)
    })
  })

  describe('confirm', () => {
    it('takes yes or no', () => {
      expect(accepts({ kind: 'confirm', value: true })).toBe(true)
      expect(accepts({ kind: 'confirm', value: false })).toBe(true)
    })

    it('rejects anything but a boolean', () => {
      expect(accepts({ kind: 'confirm', value: 'yes' })).toBe(false)
    })
  })

  it('rejects an unknown kind', () => {
    expect(accepts({ kind: 'rating', value: 5 })).toBe(false)
  })

  describe('for one question', () => {
    const question = (kind: Question['kind'], options: string[] = []) => answerSchemaFor({ kind, options })

    it('rejects an answer of another kind', () => {
      expect(question('confirm').safeParse({ kind: 'text', value: 'yes' }).success).toBe(false)
    })

    it('takes a choice only from the options, and any "Other"', () => {
      const levels = question('choice', ['B1', 'B2', 'C1'])
      expect(levels.safeParse({ kind: 'choice', value: 'B2' }).success).toBe(true)
      expect(levels.safeParse({ kind: 'choice', value: 'A1' }).success).toBe(false)
      expect(levels.safeParse({ kind: 'choice', other: 'A1' }).success).toBe(true)
    })

    it('takes ticked values only from the options', () => {
      const skills = question('multi', ['Docker', 'PostgreSQL'])
      expect(skills.safeParse({ kind: 'multi', values: ['Docker'] }).success).toBe(true)
      expect(skills.safeParse({ kind: 'multi', values: ['Docker', 'Kafka'] }).success).toBe(false)
    })
  })
})

describe('question', () => {
  const question = {
    id: ids.other,
    kind: 'choice',
    origin: 'auto',
    text: 'What is your level of English?',
    label: 'English',
    options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'],
    claim: null,
    target: { section: 'languages', itemId: ids.language, field: 'level' },
    status: 'open',
    answer: null,
  }

  it('accepts a question with an item-level target', () => {
    expect(questionSchema.safeParse(question).success).toBe(true)
  })

  it('targets any of the eight blocks', () => {
    for (const section of ['contacts', 'summary', 'skills', 'projects', 'certifications']) {
      expect(questionTargetSchema.safeParse({ section }).success).toBe(true)
    }
  })

  it('points at items only in blocks that have items', () => {
    for (const section of ['experience', 'projects', 'education', 'certifications', 'languages']) {
      expect(questionTargetSchema.safeParse({ section, itemId: ids.job }).success).toBe(true)
    }
    for (const section of ['contacts', 'summary', 'skills']) {
      expect(questionTargetSchema.safeParse({ section, itemId: ids.job }).success).toBe(false)
    }
  })

  it('keeps an answer of any kind', () => {
    for (const answer of ['B2', ['Docker'], true, null]) {
      expect(questionSchema.safeParse({ ...question, status: 'answered', answer }).success).toBe(true)
    }
  })
})
