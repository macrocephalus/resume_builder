import { describe, expect, it } from 'vitest'
import { computeMatch, type Requirement } from './index'
import { emptyDraft, fullDraft } from './testing/draft'

const requirement = (keywords: string[], label = keywords[0] ?? 'Requirement'): Requirement => ({
  id: '77777777-7777-4777-8777-777777777777',
  label,
  kind: 'skill',
  keywords,
})

const isCovered = (draft: ReturnType<typeof fullDraft>, keywords: string[]) =>
  computeMatch(draft, [requirement(keywords)]).items[0]?.covered

describe('match between a draft and the role requirements', () => {
  it('counts covered requirements out of all of them', () => {
    const match = computeMatch(fullDraft(), [requirement(['node.js']), requirement(['kubernetes']), requirement(['payments'])])

    expect(match.covered).toBe(2)
    expect(match.total).toBe(3)
    expect(match.items.map((item) => item.covered)).toEqual([true, false, true])
  })

  it('returns each requirement with its id, label and kind', () => {
    const [item] = computeMatch(fullDraft(), [{ ...requirement(['postgresql']), label: 'PostgreSQL', kind: 'skill' }]).items

    expect(item).toMatchObject({ id: '77777777-7777-4777-8777-777777777777', label: 'PostgreSQL', kind: 'skill' })
  })

  it('covers nothing in an empty draft', () => {
    expect(computeMatch(emptyDraft(), [requirement(['node.js'])])).toMatchObject({ covered: 0, total: 1 })
  })

  it('handles a role without requirements', () => {
    expect(computeMatch(fullDraft(), [])).toEqual({ covered: 0, total: 0, items: [] })
  })

  describe('normalisation', () => {
    it('ignores case', () => {
      expect(isCovered(fullDraft(), ['NODE.JS'])).toBe(true)
    })

    it('treats runs of spaces and line breaks as one space', () => {
      const draft = { ...fullDraft(), summary: 'Led a\n  payments   team.' }
      expect(isCovered(draft, ['payments team'])).toBe(true)
    })

    it('treats every kind of dash and quote alike', () => {
      const draft = { ...fullDraft(), summary: 'Wrote end—to—end tests and the “outbox” pattern.' }
      expect(isCovered(draft, ['end-to-end'])).toBe(true)
      expect(isCovered(draft, ['"outbox"'])).toBe(true)
    })

    it('ignores blank keywords', () => {
      expect(isCovered(fullDraft(), ['  '])).toBe(false)
    })
  })

  describe('word boundaries', () => {
    it('does not find a keyword inside a longer word', () => {
      const draft = { ...fullDraft(), summary: 'JavaScript developer', skills: [] }
      expect(isCovered(draft, ['java'])).toBe(false)
    })

    it('finds a keyword next to punctuation', () => {
      const draft = { ...fullDraft(), summary: 'Go, Rust (some) and C++.', skills: [] }
      expect(isCovered(draft, ['go'])).toBe(true)
      expect(isCovered(draft, ['rust'])).toBe(true)
      expect(isCovered(draft, ['c++'])).toBe(true)
    })

    it('finds a keyword with inner punctuation as one word', () => {
      const draft = { ...fullDraft(), summary: 'Built services on Node.js.', skills: [] }
      expect(isCovered(draft, ['node.js'])).toBe(true)
      expect(isCovered(draft, ['node'])).toBe(true)
    })

    it('works with letters outside latin', () => {
      const draft = { ...fullDraft(), summary: 'Керував командою з п’яти людей', skills: [] }
      expect(isCovered(draft, ['керував'])).toBe(true)
      expect(isCovered(draft, ['кер'])).toBe(false)
    })

    it('covers a requirement when any of its keywords is found', () => {
      expect(isCovered(fullDraft(), ['postgres', 'postgresql'])).toBe(true)
    })
  })

  describe('where a keyword is found', () => {
    it('looks in the summary', () => {
      const draft = { ...emptyDraft(), summary: 'Kafka at scale' }
      expect(computeMatch(draft, [requirement(['kafka'])]).items[0]?.foundIn).toEqual(['summary'])
    })

    it('looks in experience titles and bullets', () => {
      const draft = { ...fullDraft(), summary: null }
      expect(computeMatch(draft, [requirement(['backend engineer'])]).items[0]?.foundIn).toEqual(['experience'])
      expect(computeMatch(draft, [requirement(['payments api'])]).items[0]?.foundIn).toEqual(['experience'])
    })

    it('looks in project names and bullets', () => {
      const draft = fullDraft()
      expect(computeMatch(draft, [requirement(['pg-outbox'])]).items[0]?.foundIn).toEqual(['projects'])
      expect(computeMatch(draft, [requirement(['library'])]).items[0]?.foundIn).toEqual(['projects'])
    })

    it('looks in skills', () => {
      expect(computeMatch(fullDraft(), [requirement(['postgresql'])]).items[0]?.foundIn).toEqual(['skills'])
    })

    it('lists every place in a fixed order', () => {
      const draft = { ...fullDraft(), summary: 'PostgreSQL person', skills: ['PostgreSQL'] }
      expect(computeMatch(draft, [requirement(['postgresql'])]).items[0]?.foundIn).toEqual(['summary', 'skills'])
    })

    it('does not look in contacts, education, certifications or languages', () => {
      const draft = fullDraft()
      for (const keyword of ['kyiv', 'kpi', 'aws developer', 'english']) {
        expect(computeMatch(draft, [requirement([keyword])]).items[0]).toMatchObject({ covered: false, foundIn: [] })
      }
    })
  })
})
