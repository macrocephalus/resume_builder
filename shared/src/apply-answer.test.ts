import { describe, expect, it } from 'vitest'
import { applyAnswer, storedAnswer, targetExists, type Answer, type Question } from './index'
import { emptyDraft, fullDraft, ids } from './testing/draft'

const newItemId = '77777777-7777-4777-8777-777777777777'
const newId = () => newItemId

const question = (fields: Partial<Question> & Pick<Question, 'kind' | 'target'>): Question => ({
  id: '88888888-8888-4888-8888-888888888888',
  origin: 'model',
  text: 'A question',
  label: 'Label',
  options: [],
  claim: null,
  status: 'open',
  answer: null,
  ...fields,
})

const text = (value: string): Answer => ({ kind: 'text', value })

describe('applying an answer', () => {
  it('writes a text answer into a contacts field', () => {
    const asked = question({ kind: 'text', target: { section: 'contacts', field: 'phone' } })
    const data = applyAnswer(emptyDraft(), asked, text('+380 67 123 45 67'), newId)
    expect(data.contacts.phone).toBe('+380 67 123 45 67')
  })

  it('writes a picked option into a field of an item', () => {
    const asked = question({
      kind: 'choice',
      options: ['A1', 'B2', 'C1'],
      target: { section: 'languages', itemId: ids.language, field: 'level' },
    })
    const data = applyAnswer(fullDraft(), asked, { kind: 'choice', value: 'C1' }, newId)
    expect(data.languages[0]!.level).toBe('C1')
  })

  it('writes "Other" when no option was picked', () => {
    const asked = question({ kind: 'choice', options: ['A1'], target: { section: 'experience', itemId: ids.job, field: 'period' } })
    const data = applyAnswer(fullDraft(), asked, { kind: 'choice', other: '2018 – 2019' }, newId)
    expect(data.experience[0]!.period).toBe('2018 – 2019')
  })

  it('appends the answer to the summary as a sentence', () => {
    const asked = question({ kind: 'text', target: { section: 'summary' } })
    const data = applyAnswer(fullDraft(), asked, text('Led a team of four.'), newId)
    expect(data.summary).toBe('Backend engineer with six years of Node.js. Led a team of four.')
  })

  it('makes the answer the summary when there was none', () => {
    const asked = question({ kind: 'text', target: { section: 'summary' } })
    expect(applyAnswer(emptyDraft(), asked, text('Backend engineer.'), newId).summary).toBe('Backend engineer.')
  })

  it('appends the answer to the bullets of an item and to the links', () => {
    const bullet = question({ kind: 'text', target: { section: 'experience', itemId: ids.job, field: 'bullets' } })
    const link = question({ kind: 'text', target: { section: 'contacts', field: 'links' } })
    const data = applyAnswer(applyAnswer(fullDraft(), bullet, text('Cut p95 latency by half'), newId), link, text('olena.dev'), newId)
    expect(data.experience[0]!.bullets).toEqual(['Built the payments API', 'Cut p95 latency by half'])
    expect(data.contacts.links).toEqual(['github.com/olena', 'olena.dev'])
  })

  it('adds a confirmed claim to its target and nothing for a no', () => {
    const asked = question({
      kind: 'confirm',
      origin: 'verifier',
      claim: 'Mentored two juniors',
      target: { section: 'experience', itemId: ids.job, field: 'bullets' },
    })
    expect(applyAnswer(fullDraft(), asked, { kind: 'confirm', value: true }, newId).experience[0]!.bullets).toEqual([
      'Built the payments API',
      'Mentored two juniors',
    ])
    expect(applyAnswer(fullDraft(), asked, { kind: 'confirm', value: false }, newId)).toEqual(fullDraft())
  })

  it('adds the ticked skills and the comma-separated "Other", without duplicates', () => {
    const asked = question({ kind: 'multi', options: ['Docker', 'postgresql', 'Redis'], target: { section: 'skills' } })
    const answer: Answer = { kind: 'multi', values: ['Docker', 'postgresql'], other: 'Kafka, docker , gRPC' }
    expect(applyAnswer(fullDraft(), asked, answer, newId).skills).toEqual(['Node.js', 'PostgreSQL', 'Docker', 'Kafka', 'gRPC'])
  })

  it('splits a typed answer about the skills into separate skills, without the label', () => {
    const asked = question({ kind: 'text', origin: 'auto', label: 'Skills', target: { section: 'skills' } })
    const data = applyAnswer(emptyDraft(), asked, text('TypeScript, React; Node.js\nPostgreSQL,, react'), newId)
    expect(data.skills).toEqual(['TypeScript', 'React', 'Node.js', 'PostgreSQL'])
  })

  it('names a picked option about the skills by its label', () => {
    const asked = question({ kind: 'choice', label: 'English', options: ['B2', 'C1'], target: { section: 'skills' } })
    expect(applyAnswer(emptyDraft(), asked, { kind: 'choice', value: 'B2' }, newId).skills).toEqual(['English: B2'])
  })

  it('makes the answer about the whole experience block a new job, one bullet per line', () => {
    const asked = question({ kind: 'text', origin: 'auto', target: { section: 'experience' } })
    const data = applyAnswer(emptyDraft(), asked, text('Built the payments API\n\n  Ran the on-call rota  \n'), newId)
    expect(data.experience).toEqual([
      { id: newItemId, title: null, company: null, period: null, bullets: ['Built the payments API', 'Ran the on-call rota'] },
    ])
  })

  it('leaves the draft it was given untouched', () => {
    const draft = fullDraft()
    applyAnswer(draft, question({ kind: 'text', target: { section: 'contacts', field: 'phone' } }), text('+1 555'), newId)
    expect(draft).toEqual(fullDraft())
  })
})

describe('the target of a question', () => {
  it('exists for a block, and for an item that is still in the draft', () => {
    expect(targetExists(fullDraft(), question({ kind: 'text', target: { section: 'summary' } }))).toBe(true)
    expect(targetExists(fullDraft(), question({ kind: 'text', target: { section: 'education', itemId: ids.school, field: 'degree' } }))).toBe(true)
  })

  it('is gone once its item was removed', () => {
    const asked = question({ kind: 'text', target: { section: 'education', itemId: ids.school, field: 'degree' } })
    expect(targetExists({ ...fullDraft(), education: [] }, asked)).toBe(false)
  })
})

describe('the stored answer of a closed question', () => {
  it('keeps the text, the pick, the ticked values with "Other" split, or yes / no', () => {
    expect(storedAnswer(text('B2'))).toBe('B2')
    expect(storedAnswer({ kind: 'choice', other: 'Native' })).toBe('Native')
    expect(storedAnswer({ kind: 'multi', values: ['Docker'], other: 'Kafka, gRPC' })).toEqual(['Docker', 'Kafka', 'gRPC'])
    expect(storedAnswer({ kind: 'confirm', value: false })).toBe(false)
  })
})


describe('an answer never breaks the limits of a draft', () => {
  it('keeps the new job within the bullet count and length', () => {
    const asked = question({ kind: 'text', origin: 'auto', target: { section: 'experience' } })
    const lines = ['x'.repeat(500), ...Array.from({ length: 13 }, (_, index) => `Point ${index + 1}`)]
    const [job] = applyAnswer(emptyDraft(), asked, text(lines.join('\n')), newId).experience
    expect(job!.bullets).toHaveLength(12)
    expect(job!.bullets[0]).toBe('x'.repeat(400))
  })

  it('cuts a long skill and adds none past the skill count', () => {
    const asked = question({ kind: 'text', target: { section: 'skills' } })
    const full = { ...emptyDraft(), skills: Array.from({ length: 39 }, (_, index) => `Skill ${index + 1}`) }
    const data = applyAnswer(full, asked, text(`${'y'.repeat(80)}, Kafka`), newId)
    expect(data.skills).toHaveLength(40)
    expect(data.skills.at(-1)).toBe('y'.repeat(60))
  })

  it('cuts a field value to its length', () => {
    const asked = question({ kind: 'text', target: { section: 'contacts', field: 'location' } })
    expect(applyAnswer(emptyDraft(), asked, text('z'.repeat(250)), newId).contacts.location).toBe('z'.repeat(200))
  })
})
