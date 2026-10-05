import { describe, expect, it } from 'vitest'
import { CV_SECTIONS, cvDataSchema, dropEmptyItems, findMissing, isSectionEmpty } from './index'
import { emptyDraft, fullDraft, ids } from './testing/draft'

describe('what is missing in a draft', () => {
  it('reports nothing for a draft with every block filled in', () => {
    expect(findMissing(fullDraft())).toEqual([])
  })

  it('reports every required block of an empty draft, and no optional one', () => {
    expect(findMissing(emptyDraft())).toEqual([
      { section: 'contacts', field: 'fullName' },
      { section: 'contacts', field: 'email' },
      { section: 'contacts', field: 'phone' },
      { section: 'summary' },
      { section: 'experience' },
      { section: 'skills' },
    ])
  })

  it('never reports education, projects, certifications or languages as missing blocks', () => {
    const draft = { ...fullDraft(), education: [], projects: [], certifications: [], languages: [] }
    expect(findMissing(draft)).toEqual([])
  })

  it('reports the full name when it is blank', () => {
    const draft = fullDraft()
    draft.contacts.fullName = '   '
    expect(findMissing(draft)).toEqual([{ section: 'contacts', field: 'fullName' }])
  })

  it.each(['email', 'phone'] as const)('is satisfied by %s alone as the way to reach the person', (kept) => {
    const draft = fullDraft()
    draft.contacts.email = kept === 'email' ? 'olena@example.com' : null
    draft.contacts.phone = kept === 'phone' ? '+380 67 123 45 67' : ''
    expect(findMissing(draft)).toEqual([])
  })

  it('reports both email and phone when neither is given', () => {
    const draft = fullDraft()
    draft.contacts.email = null
    draft.contacts.phone = null
    expect(findMissing(draft)).toEqual([
      { section: 'contacts', field: 'email' },
      { section: 'contacts', field: 'phone' },
    ])
  })

  it('does not ask for location or links', () => {
    const draft = fullDraft()
    draft.contacts.location = null
    draft.contacts.links = []
    expect(findMissing(draft)).toEqual([])
  })

  it('treats a summary or skills made only of whitespace as missing', () => {
    expect(findMissing({ ...fullDraft(), summary: ' \n ', skills: ['', '  '] })).toEqual([
      { section: 'summary' },
      { section: 'skills' },
    ])
  })

  it('reports the experience block for a person with no experience, without any item fields', () => {
    expect(findMissing({ ...fullDraft(), experience: [] })).toEqual([{ section: 'experience' }])
  })

  it('reports the empty title, company and period of an existing experience item', () => {
    const draft = fullDraft()
    draft.experience = [{ id: ids.job, title: null, company: '', period: null, bullets: ['Built the payments API'] }]
    expect(findMissing(draft)).toEqual([
      { section: 'experience', itemId: ids.job, field: 'title' },
      { section: 'experience', itemId: ids.job, field: 'company' },
      { section: 'experience', itemId: ids.job, field: 'period' },
    ])
  })

  it('does not ask for bullets of an experience item', () => {
    const draft = fullDraft()
    draft.experience[0]!.bullets = []
    expect(findMissing(draft)).toEqual([])
  })

  it('reports the empty institution of an existing education item, but not its degree or period', () => {
    const draft = fullDraft()
    draft.education = [{ id: ids.school, institution: null, degree: 'BSc', period: null }]
    expect(findMissing(draft)).toEqual([{ section: 'education', itemId: ids.school, field: 'institution' }])
  })

  it('ignores items whose every field is empty: they are dropped on save', () => {
    const draft = fullDraft()
    draft.experience = [{ id: ids.job, title: null, company: ' ', period: null, bullets: [''] }]
    draft.education = [{ id: ids.school, institution: null, degree: null, period: '' }]
    expect(findMissing(draft)).toEqual([{ section: 'experience' }])
  })

  it('asks nothing about the fields of project, certification and language items', () => {
    const draft = fullDraft()
    draft.projects = [{ id: ids.project, name: null, period: null, url: null, bullets: ['Outbox library'] }]
    draft.certifications = [{ id: ids.certificate, name: 'AWS Developer', issuer: null, year: null }]
    draft.languages = [{ id: ids.language, name: 'English', level: null }]
    expect(findMissing(draft)).toEqual([])
  })
})

describe('empty blocks', () => {
  it('finds no empty block in a draft with every block filled in', () => {
    expect(CV_SECTIONS.filter((section) => isSectionEmpty(fullDraft(), section))).toEqual([])
  })

  it('finds every block of an empty draft empty', () => {
    expect(CV_SECTIONS.filter((section) => isSectionEmpty(emptyDraft(), section))).toEqual([...CV_SECTIONS])
  })

  it('counts contacts with a single link as not empty', () => {
    const draft = emptyDraft()
    draft.contacts.links = ['github.com/olena']
    expect(isSectionEmpty(draft, 'contacts')).toBe(false)
  })

  it('counts a block as empty when it holds only blank text or items with nothing in them', () => {
    const draft = {
      ...emptyDraft(),
      summary: '  ',
      skills: [' '],
      experience: [{ id: ids.job, title: '', company: null, period: null, bullets: [' '] }],
      languages: [{ id: ids.language, name: null, level: '' }],
    }
    expect(CV_SECTIONS.filter((section) => isSectionEmpty(draft, section))).toEqual([...CV_SECTIONS])
  })

  it('counts a block as filled when one item has a single bullet', () => {
    const draft = emptyDraft()
    draft.projects = [{ id: ids.project, name: null, period: null, url: null, bullets: ['Outbox library'] }]
    expect(isSectionEmpty(draft, 'projects')).toBe(false)
  })
})

describe('dropping empty items before a save', () => {
  it('leaves a draft with every block filled in unchanged', () => {
    expect(dropEmptyItems(fullDraft())).toEqual(fullDraft())
  })

  it('removes items whose every field is empty and keeps the others in order', () => {
    const draft = fullDraft()
    draft.experience = [
      { id: ids.other, title: null, company: ' ', period: '', bullets: [] },
      draft.experience[0]!,
    ]
    draft.projects = [{ id: ids.project, name: null, period: null, url: '', bullets: [' '] }]
    draft.education = [{ id: ids.school, institution: '', degree: null, period: null }]
    draft.certifications = [{ id: ids.certificate, name: null, issuer: null, year: null }]
    draft.languages = [{ id: ids.language, name: ' ', level: null }]

    expect(dropEmptyItems(draft)).toEqual({
      ...fullDraft(),
      projects: [],
      education: [],
      certifications: [],
      languages: [],
    })
  })

  it('keeps an item that has only one field filled in', () => {
    const draft = fullDraft()
    draft.languages = [{ id: ids.language, name: null, level: 'B2' }]
    expect(dropEmptyItems(draft).languages).toEqual([{ id: ids.language, name: null, level: 'B2' }])
  })

  it('removes blank bullets, skills and links', () => {
    const draft = fullDraft()
    draft.experience[0]!.bullets = ['Built the payments API', '', '  ']
    draft.skills = ['Node.js', ' ', 'PostgreSQL']
    draft.contacts.links = ['', 'github.com/olena']
    expect(dropEmptyItems(draft)).toEqual(fullDraft())
  })

  it('does not change the draft it was given', () => {
    const draft = fullDraft()
    draft.skills = ['Node.js', '']
    dropEmptyItems(draft)
    expect(draft.skills).toEqual(['Node.js', ''])
  })

  it('returns a draft the schema still accepts', () => {
    expect(cvDataSchema.safeParse(dropEmptyItems(emptyDraft())).success).toBe(true)
  })
})
