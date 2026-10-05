import type { CvData } from './cv-data'
import type { Requirement, RequirementKind } from './requirement'

/** The parts of a draft a keyword is searched in. */
export const MATCH_PLACES = ['summary', 'experience', 'projects', 'skills'] as const
export type MatchPlace = (typeof MATCH_PLACES)[number]

export type RequirementMatch = {
  id: string
  label: string
  kind: RequirementKind
  covered: boolean
  /** Where a keyword was found, in `MATCH_PLACES` order; empty when not covered. */
  foundIn: MatchPlace[]
}

export type Match = {
  covered: number
  total: number
  items: RequirementMatch[]
}

/** Lower case, one kind of quote and dash, single spaces. */
const normalise = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”«»„]/g, '"')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

const isWordChar = (char: string | undefined): boolean => char !== undefined && /[\p{L}\p{N}]/u.test(char)

/**
 * True when `keyword` occurs in `text` as a whole word: no letter or digit right before or after
 * it. Punctuation inside the keyword counts as part of it, so "node.js" and "c++" work, and
 * "java" is not found in "javascript".
 */
const containsWord = (text: string, keyword: string): boolean => {
  for (let at = text.indexOf(keyword); at !== -1; at = text.indexOf(keyword, at + 1)) {
    if (!isWordChar(text[at - 1]) && !isWordChar(text[at + keyword.length])) return true
  }
  return false
}

const textsOf = (data: CvData): Record<MatchPlace, string[]> => ({
  summary: data.summary === null ? [] : [data.summary],
  experience: data.experience.flatMap((item) => [item.title ?? '', ...item.bullets]),
  projects: data.projects.flatMap((item) => [item.name ?? '', ...item.bullets]),
  skills: data.skills,
})

/**
 * Which requirements the draft covers. A requirement is covered when any of its keywords occurs,
 * normalised and as a whole word, in the summary, the titles and bullets of experience and
 * projects, or the skills. Pure: the editor runs it on every edit, the backend after a draft.
 */
export const computeMatch = (data: CvData, requirements: readonly Requirement[]): Match => {
  const texts = textsOf(data)
  const places = MATCH_PLACES.map((place) => ({ place, texts: texts[place].map(normalise) }))

  const items = requirements.map(({ id, label, kind, keywords }): RequirementMatch => {
    const words = keywords.map(normalise).filter((word) => word !== '')
    const foundIn = places
      .filter(({ texts }) => texts.some((text) => words.some((word) => containsWord(text, word))))
      .map(({ place }) => place)
    return { id, label, kind, covered: foundIn.length > 0, foundIn }
  })

  return { covered: items.filter((item) => item.covered).length, total: items.length, items }
}
