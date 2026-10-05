import { describe, expect, it } from 'vitest'
import {
  CV_STATUSES,
  GENERATION_STAGES,
  canTransition,
  hasDraft,
  isInProgress,
  type CvStatus,
} from './index'

describe('CV status machine', () => {
  it('has the six statuses of docs/cv-statuses.md', () => {
    expect(CV_STATUSES).toEqual(['queued', 'generating', 'retrying', 'failed', 'needs_input', 'ready'])
  })

  it.each<[CvStatus, CvStatus]>([
    ['queued', 'generating'],
    ['generating', 'needs_input'],
    ['generating', 'ready'],
    ['generating', 'retrying'],
    ['generating', 'failed'],
    ['retrying', 'generating'],
    ['failed', 'queued'],
    ['needs_input', 'ready'],
  ])('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true)
  })

  it.each<[CvStatus, CvStatus]>([
    ['queued', 'ready'],
    ['queued', 'failed'],
    ['retrying', 'failed'],
    ['failed', 'generating'],
    ['needs_input', 'generating'],
    ['needs_input', 'failed'],
    ['ready', 'needs_input'],
    ['ready', 'queued'],
    ['ready', 'ready'],
  ])('forbids %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false)
  })

  it('treats queued, generating and retrying as in progress', () => {
    expect(CV_STATUSES.filter(isInProgress)).toEqual(['queued', 'generating', 'retrying'])
  })

  it('treats needs_input and ready as having a draft', () => {
    expect(CV_STATUSES.filter(hasDraft)).toEqual(['needs_input', 'ready'])
  })

  it('lists the generation stages in the order they happen', () => {
    expect(GENERATION_STAGES).toEqual(['drafting', 'verifying', 'revising', 'saving'])
  })
})
