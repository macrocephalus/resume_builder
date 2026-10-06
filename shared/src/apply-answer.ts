import { CV_LIMITS, ITEM_SECTIONS, type CvData, type ItemSection } from './cv-data'
import type { Answer, Question } from './question'

type MultiAnswer = Extract<Answer, { kind: 'multi' }>

const splitList = (value: string, separator: RegExp): string[] =>
  value
    .split(separator)
    .map((part) => part.trim())
    .filter((part) => part !== '')

/** The ticked options, then the comma-separated "Other". */
const multiValues = (answer: MultiAnswer): string[] => [...answer.values, ...splitList(answer.other ?? '', /,/)]

/** What a closed question keeps as its answer: the text, the picked values, or yes / no. */
export const storedAnswer = (answer: Answer): Question['answer'] => {
  switch (answer.kind) {
    case 'text':
      return answer.value
    case 'choice':
      return answer.value ?? answer.other ?? ''
    case 'multi':
      return multiValues(answer)
    case 'confirm':
      return answer.value
  }
}

/** The text an answer puts into the draft; nothing for a "no". */
const answerValues = (question: Question, answer: Answer): string[] => {
  switch (answer.kind) {
    case 'text':
      return [answer.value]
    case 'choice':
      return [answer.value ?? answer.other ?? '']
    case 'multi':
      return multiValues(answer)
    case 'confirm':
      return answer.value && question.claim !== null ? [question.claim] : []
  }
}

type Item = CvData[ItemSection][number]

/** The item a question points at, or `undefined` when it has none or the item is gone. */
const targetItem = (data: CvData, { target }: Pick<Question, 'target'>): Item | undefined => {
  const section = ITEM_SECTIONS.find((name) => name === target.section)
  if (section === undefined || target.itemId === undefined) return undefined
  const items: readonly Item[] = data[section]
  return items.find((item) => item.id === target.itemId)
}

/** False when the question is about an item that is no longer in the draft: it can't be answered. */
export const targetExists = (data: CvData, question: Pick<Question, 'target'>): boolean =>
  question.target.itemId === undefined || targetItem(data, question) !== undefined

const CONTACT_FIELDS = ['fullName', 'email', 'phone', 'location'] as const

/** Cuts a value to the length its field allows. */
const fit = (value: string, max: number): string => (value.length > max ? value.slice(0, max).trimEnd() : value)

/** Appends what still fits under the list's count limit, each value cut to its length limit. */
const appendWithin = (list: string[], added: readonly string[], limits: { count: number; length: number }) => {
  for (const value of added) {
    if (list.length >= limits.count) return
    list.push(fit(value, limits.length))
  }
}

/** Appends skills the list doesn't have yet, compared case-insensitively. */
const addSkills = (skills: string[], added: readonly string[]) => {
  const known = new Set(skills.map((skill) => skill.toLowerCase()))
  const fresh: string[] = []
  for (const skill of added.map((value) => fit(value, CV_LIMITS.skill))) {
    if (known.has(skill.toLowerCase())) continue
    known.add(skill.toLowerCase())
    fresh.push(skill)
  }
  appendWithin(skills, fresh, { count: CV_LIMITS.skills, length: CV_LIMITS.skill })
}

const bulletLimits = { count: CV_LIMITS.bullets, length: CV_LIMITS.bullet }

/**
 * The draft with an answer written into the question's target, as written — nothing is rephrased
 * (root `docs/architecture.md` §6.5). Pure: `newId` gives the id of an item the answer creates.
 *
 * - A field of the contacts or of an item gets the value; `links` and `bullets` get it appended.
 * - `summary` gets it appended as a sentence.
 * - `skills`: a `multi` adds the ticked options, a `text` answer is split on commas, semicolons
 *   and line breaks, a `choice` becomes `"{label}: {value}"` ("English: B2"); never a duplicate.
 * - The whole `experience` block: a new job whose bullets are the answer's lines; its title,
 *   company and period are left for the editor.
 * - `confirm`: yes adds the question's claim to its target, no changes nothing.
 *
 * The result stays within `CV_LIMITS`: a value is cut to its field's length, and what doesn't fit a
 * list's count is left out.
 */
export const applyAnswer = (data: CvData, question: Question, answer: Answer, newId: () => string): CvData => {
  // CvData is plain JSON, so this is a deep copy.
  const next = JSON.parse(JSON.stringify(data)) as CvData
  const values = answerValues(question, answer)
  if (values.length === 0) return next
  const { section, itemId, field } = question.target

  if (section === 'skills') {
    const lines = values.flatMap((value) => splitList(value, /[,;\n]/))
    addSkills(next.skills, answer.kind === 'choice' ? values.map((value) => `${question.label}: ${value}`) : lines)
  } else if (section === 'summary') {
    const summary = [next.summary ?? '', ...values].filter((part) => part.trim() !== '').join(' ')
    next.summary = fit(summary, CV_LIMITS.summary)
  } else if (section === 'experience' && itemId === undefined && field === undefined) {
    if (next.experience.length >= CV_LIMITS.experience) return next
    const bullets: string[] = []
    appendWithin(bullets, values.flatMap((value) => splitList(value, /\n/)), bulletLimits)
    if (bullets.length > 0) next.experience.push({ id: newId(), title: null, company: null, period: null, bullets })
  } else if (section === 'contacts') {
    if (field === 'links') appendWithin(next.contacts.links, values, { count: CV_LIMITS.links, length: CV_LIMITS.link })
    const contact = CONTACT_FIELDS.find((name) => name === field)
    if (contact !== undefined) next.contacts[contact] = fit(values.join(', '), CV_LIMITS.shortText)
  } else {
    const item = targetItem(next, question)
    if (item === undefined || field === undefined || field === 'id' || !(field in item)) return next
    if (field === 'bullets' && 'bullets' in item) appendWithin(item.bullets, values, bulletLimits)
    else Object.assign(item, { [field]: fit(values.join(', '), field === 'url' ? CV_LIMITS.link : CV_LIMITS.shortText) })
  }
  return next
}
