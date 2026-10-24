/** Fixed E2E endpoint resolver for slot 0 and controller-managed worktree slots. */
import fs from 'fs'

export interface SlotEnvironment {
  slot: number
  frontendPort: number
  backendPort: number
  token?: string
  manifestPath?: string
}

function fail(message: string): never { throw new Error(`[E2E] ${message}`) }

export function resolveSlotEnvironment(env: NodeJS.ProcessEnv = process.env): SlotEnvironment {
  const raw = env.PUNDO_SLOT
  if (!raw) return { slot: 0, frontendPort: 3500, backendPort: 8500 }
  if (!/^[1-4]$/.test(raw)) fail('PUNDO_SLOT must be 1 through 4; slot 0 is the legacy main environment.')
  const slot = Number(raw)
  const manifestPath = env.PUNDO_SLOT_MANIFEST
  if (!manifestPath || !env.PUNDO_SLOT_TOKEN) fail('a worktree slot needs PUNDO_SLOT_MANIFEST and PUNDO_SLOT_TOKEN.')
  let manifest: unknown
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) } catch { fail('slot manifest is unreadable.') }
  const candidate = manifest as { slot?: unknown; lease_token?: unknown; ports?: Record<string, unknown>; databases?: Record<string, unknown> }
  const frontendPort = 3510 + slot
  const backendPort = 8510 + slot
  if (candidate.slot !== slot || candidate.lease_token !== env.PUNDO_SLOT_TOKEN
    || candidate.ports?.frontend !== frontendPort || candidate.ports?.backend !== backendPort
    || candidate.databases?.prodcopy !== `pundo_wt_s${slot}`) fail('slot manifest/token/ports/database do not match the fixed contract.')
  if ((env.E2E_FRONTEND_PORT && Number(env.E2E_FRONTEND_PORT) !== frontendPort)
    || (env.E2E_BACKEND_PORT && Number(env.E2E_BACKEND_PORT) !== backendPort)) fail('an explicit E2E port conflicts with the slot manifest.')
  return { slot, frontendPort, backendPort, token: env.PUNDO_SLOT_TOKEN, manifestPath }
}

export const SLOT_ENV = resolveSlotEnvironment()
export const BASE_URL = process.env.FRONTEND_URL ?? process.env.TEST_BASE_URL ?? `http://127.0.0.1:${SLOT_ENV.frontendPort}`
export const BACKEND_URL = process.env.TEST_BACKEND_URL ?? process.env.BACKEND_URL ?? `http://localhost:${SLOT_ENV.backendPort}`

function portOf(url: string): string { try { return new URL(url).port } catch { return fail(`invalid test URL: ${url}`) } }
if (BACKEND_URL.includes(':8000') || BASE_URL.includes(':3000') || BACKEND_URL.includes(':8100')) fail('a test URL points at a production port (3000/8000/8100).')
if (portOf(BACKEND_URL) !== String(SLOT_ENV.backendPort) || portOf(BASE_URL) !== String(SLOT_ENV.frontendPort)) fail('frontend/backend URL does not match the selected slot port pair.')
export const IS_WORKTREE_SLOT = SLOT_ENV.slot !== 0
