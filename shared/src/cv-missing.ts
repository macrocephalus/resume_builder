import { type CvData, type CvSection, type ItemSection } from './cv-data'

/** A required block or field the draft doesn't have. `itemId` + `field` point inside an item. */
export type MissingPart = {
  section: CvSection
  itemId?: string
  field?: string
}

const isBlank = (value: string | null): boolean => value === null || value.trim() === ''
const allBlank = (values: readonly string[]): boolean => values.every(isBlank)

/** An item is empty when nothing in it would be rendered: no text field and no bullet. */
const isItemEmpty = (item: CvData[ItemSection][number]): boolean =>
  Object.entries(item).every(([key, value]) => key === 'id' || (Array.isArray(value) ? allBlank(value) : isBlank(value)))

/** True when the block has nothing to render, so the preview and the PDF skip it. */
export const isSectionEmpty = (data: CvData, section: CvSection): boolean => {
  switch (section) {
    case 'contacts': {
      const { links, ...fields } = data.contacts
      return Object.values(fields).every(isBlank) && allBlank(links)
    }
    case 'summary':
      return isBlank(data.summary)
    case 'skills':
      return allBlank(data.skills)
    default:
      return data[section].every(isItemEmpty)
  }
}

/**
 * Removes what would never be rendered: items whose every field is empty, and blank bullets,
 * skills and links. Run before a draft is saved.
 */
export const dropEmptyItems = (data: CvData): CvData => {
  const filled = (values: readonly string[]) => values.filter((value) => !isBlank(value))
  const items = <T extends CvData[ItemSection][number]>(list: readonly T[]) => list.filter((item) => !isItemEmpty(item))
  return {
    ...data,
    contacts: { ...data.contacts, links: filled(data.contacts.links) },
    experience: items(data.experience).map((item) => ({ ...item, bullets: filled(item.bullets) })),
    projects: items(data.projects).map((item) => ({ ...item, bullets: filled(item.bullets) })),
    education: items(data.education),
    certifications: items(data.certifications),
    skills: filled(data.skills),
    languages: items(data.languages),
  }
}

/**
 * Required blocks and fields the draft lacks, in the order they should be asked about.
 *
 * Required: full name and at least one of email / phone, summary, experience, skills. Inside an
 * existing item: title, company and period of experience, institution of education. Education,
 * projects, certifications and languages are optional blocks and are never reported.
 */
export const findMissing = (data: CvData): MissingPart[] => {
  const missing: MissingPart[] = []
  const { fullName, email, phone } = data.contacts

  if (isBlank(fullName)) missing.push({ section: 'contacts', field: 'fullName' })
  if (isBlank(email) && isBlank(phone)) {
    missing.push({ section: 'contacts', field: 'email' }, { section: 'contacts', field: 'phone' })
  }
  if (isSectionEmpty(data, 'summary')) missing.push({ section: 'summary' })

  if (isSectionEmpty(data, 'experience')) missing.push({ section: 'experience' })
  for (const item of data.experience) {
    if (isItemEmpty(item)) continue
    for (const field of ['title', 'company', 'period'] as const) {
      if (isBlank(item[field])) missing.push({ section: 'experience', itemId: item.id, field })
    }
  }

  for (const item of data.education) {
    if (!isItemEmpty(item) && isBlank(item.institution)) {
      missing.push({ section: 'education', itemId: item.id, field: 'institution' })
    }
  }

  if (isSectionEmpty(data, 'skills')) missing.push({ section: 'skills' })
  return missing
}
