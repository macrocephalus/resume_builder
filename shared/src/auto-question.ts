import type { CvData } from './cv-data'
import type { MissingPart } from './cv-missing'
import { type CvLanguage, getCvLanguage } from './cv-language'

/**
 * Every part `findMissing` can report, as `section` or `section.field`. Each CV language has a
 * question and a label for each of them (`CvLanguageInfo.autoQuestions`).
 */
export const AUTO_QUESTION_PARTS = [
  'contacts.fullName',
  'contacts.email',
  'contacts.phone',
  'summary',
  'experience',
  'experience.title',
  'experience.company',
  'experience.period',
  'education.institution',
  'skills',
] as const
export type AutoQuestionPart = (typeof AUTO_QUESTION_PARTS)[number]

/** The wording of an auto question: `text` is asked, `label` is the short field name. */
export type AutoQuestionText = { text: string; label: string }

const isAutoQuestionPart = (key: string): key is AutoQuestionPart =>
  (AUTO_QUESTION_PARTS as readonly string[]).includes(key)

const named = (...candidates: (string | null)[]): string | null =>
  candidates.find((value) => value !== null && value.trim() !== '')?.trim() ?? null

/** What the user calls the item a missing field belongs to: a job by its company or title, a school by its degree. */
const itemName = (data: CvData, part: MissingPart): string | null => {
  if (part.section === 'experience') {
    const job = data.experience.find((item) => item.id === part.itemId)
    return job ? named(job.company, job.title) : null
  }
  if (part.section === 'education') {
    const school = data.education.find((item) => item.id === part.itemId)
    return school ? named(school.degree) : null
  }
  return null
}

/**
 * The question and label for a part `findMissing` reported, in the CV language. A field of an
 * item is asked with the item's name in front ("Fintory: When did you work there?") when it has one.
 */
export const autoQuestionText = (data: CvData, part: MissingPart, language: CvLanguage): AutoQuestionText => {
  const key = part.field === undefined ? part.section : `${part.section}.${part.field}`
  if (!isAutoQuestionPart(key)) throw new Error(`No auto question for ${key}`)
  const { text, label } = getCvLanguage(language).autoQuestions[key]
  const name = part.itemId === undefined ? null : itemName(data, part)
  return { text: name === null ? text : `${name}: ${text}`, label }
}
