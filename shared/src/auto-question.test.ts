import { describe, expect, it } from 'vitest'
import { AUTO_QUESTION_PARTS, CV_LANGUAGES, autoQuestionText, findMissing } from './index'
import { emptyDraft, fullDraft, ids } from './testing/draft'

describe('auto-question texts', () => {
  it('has a question and a label for every missing part in every language', () => {
    for (const language of CV_LANGUAGES) {
      expect(Object.keys(language.autoQuestions).sort()).toEqual([...AUTO_QUESTION_PARTS].sort())
      for (const { text, label } of Object.values(language.autoQuestions)) {
        expect(text.trim()).not.toBe('')
        expect(label.trim()).not.toBe('')
      }
    }
  })
})

describe('wording an auto question', () => {
  it('asks about a missing block in the CV language', () => {
    expect(autoQuestionText(emptyDraft(), { section: 'summary' }, 'en')).toEqual({
      text: 'In two or three sentences, who are you as a professional and what do you do best?',
      label: 'Summary',
    })
  })

  it('asks about a missing block in Ukrainian', () => {
    expect(autoQuestionText(emptyDraft(), { section: 'summary' }, 'uk')).toEqual({
      text: 'Хто ви як фахівець і що вмієте найкраще? Двома-трьома реченнями.',
      label: 'Профіль',
    })
  })

  it('asks for the most recent job, one point per line, when the draft has no experience', () => {
    expect(autoQuestionText(emptyDraft(), { section: 'experience' }, 'en').text).toBe(
      'What did you do in your most recent job? One point per line. Add the title, company and dates in the editor. Skip this if you have no work experience yet.',
    )
  })

  it('names the item a missing field belongs to', () => {
    const draft = fullDraft()
    draft.experience[0]!.period = null
    expect(autoQuestionText(draft, { section: 'experience', itemId: ids.job, field: 'period' }, 'uk')).toEqual({
      text: 'Fintory: Коли ви там працювали? Наприклад, 2019 – 2022.',
      label: 'Період',
    })
  })

  it('names a job by its title when the company is the missing field', () => {
    const draft = fullDraft()
    draft.experience[0]!.company = null
    expect(autoQuestionText(draft, { section: 'experience', itemId: ids.job, field: 'company' }, 'en')).toEqual({
      text: 'Backend Engineer: Which company was it?',
      label: 'Company',
    })
  })

  it('names a school by its degree', () => {
    const draft = fullDraft()
    draft.education[0]!.institution = null
    expect(autoQuestionText(draft, { section: 'education', itemId: ids.school, field: 'institution' }, 'en').text).toBe(
      'BSc Computer Science: Which school or university was it?',
    )
  })

  it('asks without a name when the item has nothing to be named by', () => {
    const draft = fullDraft()
    draft.experience[0] = { id: ids.job, title: null, company: null, period: '2020', bullets: ['Built the payments API'] }
    expect(autoQuestionText(draft, { section: 'experience', itemId: ids.job, field: 'title' }, 'en').text).toBe(
      'What was your job title?',
    )
  })

  it('words every part findMissing reports for an empty draft', () => {
    const draft = emptyDraft()
    expect(findMissing(draft).map((part) => autoQuestionText(draft, part, 'en').label)).toEqual([
      'Full name',
      'Email',
      'Phone',
      'Summary',
      'Experience',
      'Skills',
    ])
  })

  it('words every field findMissing reports inside items', () => {
    const draft = fullDraft()
    draft.experience = [{ id: ids.job, title: null, company: null, period: null, bullets: ['Built the payments API'] }]
    draft.education = [{ id: ids.school, institution: null, degree: null, period: '2017' }]
    expect(findMissing(draft).map((part) => autoQuestionText(draft, part, 'en').label)).toEqual([
      'Job title',
      'Company',
      'Period',
      'Institution',
    ])
  })

  it('refuses a part findMissing never reports', () => {
    expect(() => autoQuestionText(fullDraft(), { section: 'projects' }, 'en')).toThrow()
  })
})
