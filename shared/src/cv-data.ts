import { z } from 'zod'

/** The blocks of a draft. Contacts is the header of the CV; the other seven can be reordered. */
export const CV_SECTIONS = [
  'contacts',
  'summary',
  'experience',
  'projects',
  'education',
  'certifications',
  'skills',
  'languages',
] as const
export type CvSection = (typeof CV_SECTIONS)[number]

export const MOVABLE_SECTIONS = [
  'summary',
  'experience',
  'projects',
  'education',
  'certifications',
  'skills',
  'languages',
] as const satisfies readonly Exclude<CvSection, 'contacts'>[]
export type MovableSection = (typeof MOVABLE_SECTIONS)[number]

/** Blocks made of items with ids. */
export const ITEM_SECTIONS = [
  'experience',
  'projects',
  'education',
  'certifications',
  'languages',
] as const satisfies readonly CvSection[]
export type ItemSection = (typeof ITEM_SECTIONS)[number]

/** Order of a new draft; fixed, never chosen by the model. */
export const DEFAULT_SECTION_ORDER: readonly MovableSection[] = [
  'summary',
  'experience',
  'projects',
  'education',
  'certifications',
  'skills',
  'languages',
]

export const CV_LIMITS = {
  /** name, title, company, period, level… */
  shortText: 200,
  link: 300,
  summary: 2000,
  links: 5,
  experience: 10,
  projects: 6,
  education: 6,
  certifications: 10,
  languages: 8,
  bullets: 12,
  bullet: 400,
  skills: 40,
  skill: 60,
} as const

// Every field may be empty: the model must not invent what the source doesn't say.
const shortText = z.string().max(CV_LIMITS.shortText).nullable()
const link = z.string().max(CV_LIMITS.link)
const bullets = z.array(z.string().max(CV_LIMITS.bullet)).max(CV_LIMITS.bullets)
const itemId = z.uuid()

export const contactsSchema = z.object({
  fullName: shortText,
  email: shortText,
  phone: shortText,
  location: shortText,
  links: z.array(link).max(CV_LIMITS.links),
})

export const experienceItemSchema = z.object({
  id: itemId,
  title: shortText,
  company: shortText,
  period: shortText,
  bullets,
})

export const projectItemSchema = z.object({
  id: itemId,
  name: shortText,
  period: shortText,
  url: link.nullable(),
  bullets,
})

export const educationItemSchema = z.object({
  id: itemId,
  institution: shortText,
  degree: shortText,
  period: shortText,
})

export const certificationItemSchema = z.object({
  id: itemId,
  name: shortText,
  issuer: shortText,
  year: shortText,
})

export const languageItemSchema = z.object({
  id: itemId,
  name: shortText,
  level: shortText,
})

const sectionOrderSchema = z
  .array(z.enum(MOVABLE_SECTIONS))
  .refine((order) => order.length === MOVABLE_SECTIONS.length && new Set(order).size === order.length, {
    error: 'Must list each movable block exactly once',
  })

export const cvDataSchema = z
  .object({
    contacts: contactsSchema,
    summary: z.string().max(CV_LIMITS.summary).nullable(),
    experience: z.array(experienceItemSchema).max(CV_LIMITS.experience),
    projects: z.array(projectItemSchema).max(CV_LIMITS.projects),
    education: z.array(educationItemSchema).max(CV_LIMITS.education),
    certifications: z.array(certificationItemSchema).max(CV_LIMITS.certifications),
    skills: z.array(z.string().max(CV_LIMITS.skill)).max(CV_LIMITS.skills),
    languages: z.array(languageItemSchema).max(CV_LIMITS.languages),
    sectionOrder: sectionOrderSchema,
  })
  .superRefine((data, ctx) => {
    // questions and edits address items by id, so an id must name one item in the whole draft
    const seen = new Set<string>()
    for (const section of ITEM_SECTIONS) {
      data[section].forEach((item, index) => {
        if (seen.has(item.id)) {
          ctx.addIssue({ code: 'custom', message: 'Duplicate item id', path: [section, index, 'id'] })
        }
        seen.add(item.id)
      })
    }
  })

export type CvData = z.infer<typeof cvDataSchema>
export type CvContacts = z.infer<typeof contactsSchema>
export type ExperienceItem = z.infer<typeof experienceItemSchema>
export type ProjectItem = z.infer<typeof projectItemSchema>
export type EducationItem = z.infer<typeof educationItemSchema>
export type CertificationItem = z.infer<typeof certificationItemSchema>
export type LanguageItem = z.infer<typeof languageItemSchema>
