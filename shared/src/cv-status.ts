export const CV_STATUSES = [
  'queued',
  'generating',
  'retrying',
  'failed',
  'needs_input',
  'ready',
] as const
export type CvStatus = (typeof CV_STATUSES)[number]

export const CV_TRANSITIONS: Record<CvStatus, readonly CvStatus[]> = {
  queued: ['generating'],
  generating: ['needs_input', 'ready', 'retrying', 'failed'],
  retrying: ['generating'],
  failed: ['queued'],
  needs_input: ['ready'],
  ready: [],
}

export const canTransition = (from: CvStatus, to: CvStatus): boolean =>
  CV_TRANSITIONS[from].includes(to)

export const isInProgress = (status: CvStatus): boolean =>
  status === 'queued' || status === 'generating' || status === 'retrying'

export const hasDraft = (status: CvStatus): boolean =>
  status === 'needs_input' || status === 'ready'

export const GENERATION_STAGES = ['drafting', 'verifying', 'revising', 'saving'] as const
export type GenerationStage = (typeof GENERATION_STAGES)[number]
