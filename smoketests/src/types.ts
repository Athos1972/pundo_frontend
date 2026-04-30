/**
 * Shared types for the smoketester runner and reporters.
 */

export type RunStatus = 'PASS' | 'FAIL' | 'SKIPPED'
export type Phase = 'anonymous' | 'authenticated' | 'negative-auth'

export interface AssertResult {
  ok: boolean
  expected: unknown
  actual: unknown
  message: string
}

export interface RunResult {
  /** Unique ID: checkId/brand/lang */
  id: string
  /** ID from manifest */
  checkId: string
  brand: string
  lang: string
  phase: Phase
  status: RunStatus
  /** Duration in milliseconds */
  duration: number
  message?: string
  screenshot?: Buffer
  assertResults?: AssertResult[]
}

export interface ReportData {
  results: RunResult[]
  manifestVersion: string
  commitSha: string
  runDurationMs: number
  brands: string[]
  loginFailed: boolean
}

export type SubjectPrefix = '[SMOKE OK]' | '[SMOKE FAIL]' | '[SMOKE BLOCKED]'

export interface TextReportData extends ReportData {
  subjectPrefix: SubjectPrefix
}
