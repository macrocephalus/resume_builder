import { z } from 'zod'
import type { CvSection } from './cv-data'

export type CvLanguageInfo = {
  code: string
  /** Put into the prompt, never user text. */
  englishName: string
  /** Shown in the language picker. */
  nativeName: string
  /** Block headings of the preview and the PDF. */
  headings: Record<CvSection, string>
}

/**
 * The languages a CV can be written in. Limited to scripts the bundled Liberation Sans covers
 * (Latin, Cyrillic, Greek). Adding a language is one entry.
 */
export const CV_LANGUAGES = [
  {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    headings: {
      contacts: 'Contacts',
      summary: 'Summary',
      experience: 'Experience',
      projects: 'Projects',
      education: 'Education',
      certifications: 'Certifications',
      skills: 'Skills',
      languages: 'Languages',
    },
  },
  {
    code: 'uk',
    englishName: 'Ukrainian',
    nativeName: 'Українська',
    headings: {
      contacts: 'Контакти',
      summary: 'Профіль',
      experience: 'Досвід роботи',
      projects: 'Проєкти',
      education: 'Освіта',
      certifications: 'Сертифікати',
      skills: 'Навички',
      languages: 'Мови',
    },
  },
  {
    code: 'pl',
    englishName: 'Polish',
    nativeName: 'Polski',
    headings: {
      contacts: 'Kontakt',
      summary: 'Podsumowanie',
      experience: 'Doświadczenie zawodowe',
      projects: 'Projekty',
      education: 'Wykształcenie',
      certifications: 'Certyfikaty',
      skills: 'Umiejętności',
      languages: 'Języki',
    },
  },
  {
    code: 'de',
    englishName: 'German',
    nativeName: 'Deutsch',
    headings: {
      contacts: 'Kontakt',
      summary: 'Profil',
      experience: 'Berufserfahrung',
      projects: 'Projekte',
      education: 'Ausbildung',
      certifications: 'Zertifikate',
      skills: 'Kenntnisse',
      languages: 'Sprachen',
    },
  },
  {
    code: 'fr',
    englishName: 'French',
    nativeName: 'Français',
    headings: {
      contacts: 'Coordonnées',
      summary: 'Profil',
      experience: 'Expérience professionnelle',
      projects: 'Projets',
      education: 'Formation',
      certifications: 'Certifications',
      skills: 'Compétences',
      languages: 'Langues',
    },
  },
  {
    code: 'es',
    englishName: 'Spanish',
    nativeName: 'Español',
    headings: {
      contacts: 'Contacto',
      summary: 'Perfil',
      experience: 'Experiencia profesional',
      projects: 'Proyectos',
      education: 'Formación',
      certifications: 'Certificaciones',
      skills: 'Habilidades',
      languages: 'Idiomas',
    },
  },
] as const satisfies readonly CvLanguageInfo[]

export type CvLanguage = (typeof CV_LANGUAGES)[number]['code']

export const CV_LANGUAGE_CODES = CV_LANGUAGES.map((language) => language.code) as [CvLanguage, ...CvLanguage[]]

export const DEFAULT_CV_LANGUAGE: CvLanguage = 'en'

export const cvLanguageSchema = z.enum(CV_LANGUAGE_CODES)

export const getCvLanguage = (code: CvLanguage): CvLanguageInfo => {
  const language = CV_LANGUAGES.find((entry) => entry.code === code)
  if (!language) throw new Error(`Unknown CV language: ${code}`)
  return language
}
