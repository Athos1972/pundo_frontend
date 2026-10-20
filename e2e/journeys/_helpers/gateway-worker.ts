/**
 * Golden-Canned-Worker fuer Journeys (B8950-016 T14): beantwortet EINEN eigenen Gateway-Task mit der Antwort aus dem
 * Golden-Fixture des Workers (`pundo_llm_workers/tests/contracts/golden/<job_type>.json`, exakt die Huelle
 * `{output, raw}`, die der echte Worker schickt). Der Task wird ueber `payload_contains` gefunden; fremde Tasks der
 * Queue (Prod-Kopie) werden nie geleast. Der Rest der Kette (Webhook, Handler, DB, Mail) ist echt.
 */
import fs from 'fs'
import path from 'path'

export const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:8600'
export const GATEWAY_API_KEY = process.env.GATEWAY_INTERNAL_API_KEY ?? 'test-key'
const WORKERS_REPO = process.env.WORKERS_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_llm_workers'
export const GOLDEN_DIR = path.join(WORKERS_REPO, 'tests', 'contracts', 'golden')

if (GATEWAY_URL.includes(':8100')) throw new Error('Safety: never answer tasks of the PRODUCTION gateway (8100)')

export type WorkerResult = { output: Record<string, unknown>; raw: string }
export type GatewayTask = { task_id: string; job_type: string; payload: Record<string, unknown> }

/** Wahr, wenn Gateway-Testserver und Golden-Fixtures da sind; sonst Grund zum sichtbaren Ueberspringen. */
export async function gatewaySkipReason(jobType: string): Promise<string | null> {
  if (!fs.existsSync(path.join(GOLDEN_DIR, `${jobType}.json`))) return `Golden-Fixture ${jobType}.json fehlt (${GOLDEN_DIR})`
  try {
    const res = await fetch(`${GATEWAY_URL}/openapi.json`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return `Gateway ${GATEWAY_URL} antwortet mit HTTP ${res.status}`
  } catch {
    return `Gateway-Testserver ${GATEWAY_URL} nicht erreichbar (pundo_llm_gateway/scripts/start_test_server.sh)`
  }
  return null
}

export function goldenResult(jobType: string): WorkerResult {
  const doc = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, `${jobType}.json`), 'utf8')) as { submit_result: { result: WorkerResult } }
  return doc.submit_result.result
}

/** Golden-Antwort, einzelne Ausgabefelder ersetzt (Werte aus dem Task-Payload). */
export function cannedFromGolden(jobType: string, overrides: Record<string, unknown> = {}): WorkerResult {
  const output = { ...goldenResult(jobType).output, ...overrides }
  return { output, raw: JSON.stringify(output) }
}

/** Wartet auf den eigenen Task (Payload enthaelt `needle`, Format wie jsonb::text) und leased ihn; null bei Timeout. */
export async function leaseOwnTask(jobType: string, needle: string, timeoutMs = 20_000): Promise<GatewayTask | null> {
  const qs = new URLSearchParams({ capabilities: 'text,embed,vision', worker_id: 'playwright-e2e' })
  qs.append('job_type', jobType)
  qs.append('payload_contains', needle)
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const res = await fetch(`${GATEWAY_URL}/v1/tasks/next?${qs}`, { headers: { 'X-Internal-API-Key': GATEWAY_API_KEY } })
    if (res.status === 200) return (await res.json()) as GatewayTask
    if (res.status !== 204) throw new Error(`Gateway /next -> HTTP ${res.status}: ${await res.text()}`)
    await new Promise((r) => setTimeout(r, 400))
  }
  return null
}

export async function submitResult(taskId: string, result: WorkerResult, model = 'golden-model'): Promise<number> {
  const res = await fetch(`${GATEWAY_URL}/v1/tasks/${taskId}/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-API-Key': GATEWAY_API_KEY },
    body: JSON.stringify({ worker_id: 'playwright-e2e', result, tokens_in: 10, tokens_out: 10, actual_model: model, cache_hit: false, is_batch: false }),
  })
  return res.status
}

export async function failTask(taskId: string, error: string): Promise<number> {
  const res = await fetch(`${GATEWAY_URL}/v1/tasks/${taskId}/fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-API-Key': GATEWAY_API_KEY },
    body: JSON.stringify({ worker_id: 'playwright-e2e', error, retryable: false }),
  })
  return res.status
}
