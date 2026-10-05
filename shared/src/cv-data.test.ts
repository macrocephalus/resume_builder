import { describe, expect, it } from 'vitest'
import { CV_SECTIONS, DEFAULT_SECTION_ORDER, cvDataSchema } from './index'
import { emptyDraft, fullDraft, ids } from './testing/draft'

const accepts = (draft: unknown) => cvDataSchema.safeParse(draft).success

describe('draft schema', () => {
  it('has eight blocks, contacts first', () => {
    expect(CV_SECTIONS).toEqual([
      'contacts',
      'summary',
      'experience',
      'projects',
      'education',
      'certifications',
      'skills',
      'languages',
    ])
  })

  it('accepts a draft with every block filled in and returns it unchanged', () => {
    expect(cvDataSchema.parse(fullDraft())).toEqual(fullDraft())
  })

  it('accepts a draft with every field empty, because the model must not invent them', () => {
    expect(accepts(emptyDraft())).toBe(true)
    expect(
      accepts({
        ...emptyDraft(),
        experience: [{ id: ids.job, title: null, company: null, period: null, bullets: [] }],
        languages: [{ id: ids.language, name: null, level: null }],
      }),
    ).toBe(true)
  })

  it('strips keys it does not know', () => {
    const parsed = cvDataSchema.parse({ ...fullDraft(), userId: 'someone-else' })
    expect(parsed).not.toHaveProperty('userId')
  })

  it('rejects a draft without one of the blocks', () => {
    const { languages: _languages, ...withoutLanguages } = fullDraft()
    expect(accepts(withoutLanguages)).toBe(false)
  })

  describe('limits', () => {
    const job = (n: number) => ({
      id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      title: 'Engineer',
      company: null,
      period: null,
      bullets: [],
    })

    it('allows 10 experience items and rejects 11', () => {
      expect(accepts({ ...emptyDraft(), experience: Array.from({ length: 10 }, (_, i) => job(i)) })).toBe(true)
      expect(accepts({ ...emptyDraft(), experience: Array.from({ length: 11 }, (_, i) => job(i)) })).toBe(false)
    })

    it('allows 12 bullets of 400 chars and rejects a 13th bullet or a longer one', () => {
      const withBullets = (bullets: string[]) => ({ ...emptyDraft(), experience: [{ ...job(1), bullets }] })
      expect(accepts(withBullets(Array.from({ length: 12 }, () => 'x'.repeat(400))))).toBe(true)
      expect(accepts(withBullets(Array.from({ length: 13 }, () => 'x')))).toBe(false)
      expect(accepts(withBullets(['x'.repeat(401)]))).toBe(false)
    })

    it('allows 40 skills of 60 chars and rejects a 41st skill or a longer one', () => {
      expect(accepts({ ...emptyDraft(), skills: Array.from({ length: 40 }, () => 'x'.repeat(60)) })).toBe(true)
      expect(accepts({ ...emptyDraft(), skills: Array.from({ length: 41 }, () => 'x') })).toBe(false)
      expect(accepts({ ...emptyDraft(), skills: ['x'.repeat(61)] })).toBe(false)
    })

    it('allows a 200-char name, a 300-char link and a 2000-char summary, and rejects longer ones', () => {
      const withTexts = (name: number, linkLength: number, summary: number) => ({
        ...emptyDraft(),
        contacts: { ...emptyDraft().contacts, fullName: 'x'.repeat(name), links: ['x'.repeat(linkLength)] },
        summary: 'x'.repeat(summary),
      })
      expect(accepts(withTexts(200, 300, 2000))).toBe(true)
      expect(accepts(withTexts(201, 300, 2000))).toBe(false)
      expect(accepts(withTexts(200, 301, 2000))).toBe(false)
      expect(accepts(withTexts(200, 300, 2001))).toBe(false)
    })

    it('rejects a sixth link', () => {
      const withLinks = (n: number) => ({
        ...emptyDraft(),
        contacts: { ...emptyDraft().contacts, links: Array.from({ length: n }, (_, i) => `example.com/${i}`) },
      })
      expect(accepts(withLinks(5))).toBe(true)
      expect(accepts(withLinks(6))).toBe(false)
    })

    const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
    const itemsOf = {
      projects: (n: number) => ({ id: uuid(n), name: null, period: null, url: null, bullets: [] }),
      education: (n: number) => ({ id: uuid(n), institution: null, degree: null, period: null }),
      certifications: (n: number) => ({ id: uuid(n), name: null, issuer: null, year: null }),
      languages: (n: number) => ({ id: uuid(n), name: null, level: null }),
    }

    it.each([
      ['projects', 6],
      ['education', 6],
      ['certifications', 10],
      ['languages', 8],
    ] as const)('allows %s up to %i items and rejects one more', (section, max) => {
      const withItems = (n: number) => ({ ...emptyDraft(), [section]: Array.from({ length: n }, (_, i) => itemsOf[section](i)) })
      expect(accepts(withItems(max))).toBe(true)
      expect(accepts(withItems(max + 1))).toBe(false)
    })
  })

  describe('block order', () => {
    it('defaults to summary, experience, projects, education, certifications, skills, languages', () => {
      expect(DEFAULT_SECTION_ORDER).toEqual([
        'summary',
        'experience',
        'projects',
        'education',
        'certifications',
        'skills',
        'languages',
      ])
    })

    it('accepts the seven movable blocks in any order', () => {
      expect(
        accepts({
          ...fullDraft(),
          sectionOrder: ['skills', 'languages', 'projects', 'experience', 'summary', 'education', 'certifications'],
        }),
      ).toBe(true)
    })

    it('rejects an order that misses a block', () => {
      expect(accepts({ ...fullDraft(), sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills', 'languages'] })).toBe(false)
    })

    it('rejects an order that repeats a block', () => {
      expect(
        accepts({
          ...fullDraft(),
          sectionOrder: ['summary', 'summary', 'projects', 'education', 'certifications', 'skills', 'languages'],
        }),
      ).toBe(false)
    })

    it('rejects an order that moves contacts, which always come first', () => {
      expect(
        accepts({
          ...fullDraft(),
          sectionOrder: ['contacts', 'experience', 'projects', 'education', 'certifications', 'skills', 'languages'],
        }),
      ).toBe(false)
    })
  })

  describe('item ids', () => {
    it('rejects an id that is not a UUID', () => {
      const draft = fullDraft()
      expect(accepts({ ...draft, experience: [{ ...draft.experience[0], id: 'job-1' }] })).toBe(false)
    })

    it('rejects the same id used twice in one block', () => {
      const draft = fullDraft()
      expect(accepts({ ...draft, experience: [draft.experience[0], draft.experience[0]] })).toBe(false)
    })

    it('rejects the same id used in two different blocks', () => {
      const draft = fullDraft()
      expect(accepts({ ...draft, languages: [{ id: ids.job, name: 'Polish', level: null }] })).toBe(false)
    })
  })
})
