import type { CvData } from '../index'

export const ids = {
  job: '11111111-1111-4111-8111-111111111111',
  project: '22222222-2222-4222-8222-222222222222',
  school: '33333333-3333-4333-8333-333333333333',
  certificate: '44444444-4444-4444-8444-444444444444',
  language: '55555555-5555-4555-8555-555555555555',
  other: '66666666-6666-4666-8666-666666666666',
}

/** A draft with every block filled in. */
export const fullDraft = (): CvData => ({
  contacts: {
    fullName: 'Olena Hnatiuk',
    email: 'olena@example.com',
    phone: '+380 67 123 45 67',
    location: 'Kyiv',
    links: ['github.com/olena'],
  },
  summary: 'Backend engineer with six years of Node.js.',
  experience: [
    {
      id: ids.job,
      title: 'Backend Engineer',
      company: 'Fintory',
      period: '2019 – present',
      bullets: ['Built the payments API'],
    },
  ],
  projects: [
    { id: ids.project, name: 'pg-outbox', period: '2023', url: 'github.com/olena/pg-outbox', bullets: ['Outbox library'] },
  ],
  education: [{ id: ids.school, institution: 'KPI', degree: 'BSc Computer Science', period: '2013 – 2017' }],
  certifications: [{ id: ids.certificate, name: 'AWS Developer', issuer: 'Amazon', year: '2022' }],
  skills: ['Node.js', 'PostgreSQL'],
  languages: [{ id: ids.language, name: 'English', level: 'B2' }],
  sectionOrder: ['summary', 'experience', 'projects', 'education', 'certifications', 'skills', 'languages'],
})

/** A draft with nothing in it: what the model returns when the source says nothing. */
export const emptyDraft = (): CvData => ({
  contacts: { fullName: null, email: null, phone: null, location: null, links: [] },
  summary: null,
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  skills: [],
  languages: [],
  sectionOrder: ['summary', 'experience', 'projects', 'education', 'certifications', 'skills', 'languages'],
})
