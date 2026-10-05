import { describe, expect, it } from 'vitest'
import { CV_LANGUAGES, CV_SECTIONS, DEFAULT_CV_LANGUAGE, cvLanguageSchema, getCvLanguage } from './index'

describe('CV languages', () => {
  it('offers English, Ukrainian, Polish, German, French and Spanish, English by default', () => {
    expect(CV_LANGUAGES.map((language) => language.code)).toEqual(['en', 'uk', 'pl', 'de', 'fr', 'es'])
    expect(DEFAULT_CV_LANGUAGE).toBe('en')
  })

  it('has a heading for each of the eight blocks in every language', () => {
    for (const language of CV_LANGUAGES) {
      expect(Object.keys(language.headings).sort()).toEqual([...CV_SECTIONS].sort())
      for (const heading of Object.values(language.headings)) expect(heading.trim()).not.toBe('')
    }
  })

  it('names each language in English and in itself', () => {
    expect(getCvLanguage('uk')).toMatchObject({ englishName: 'Ukrainian', nativeName: 'Українська' })
  })

  it('accepts only codes from the list', () => {
    expect(cvLanguageSchema.safeParse('de').success).toBe(true)
    expect(cvLanguageSchema.safeParse('ru').success).toBe(false)
    expect(cvLanguageSchema.safeParse('English').success).toBe(false)
  })
})
