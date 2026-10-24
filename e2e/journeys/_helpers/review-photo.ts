/**
 * Helfer fuer die Journey review-photo-moderation (F3700): Foto-Upload des Kunden und die Gateway-Seite der Kette.
 * Wie `gateway-worker.ts` beantwortet der Test nur den EIGENEN Auftrag (ueber die Task-ID aus der Datenbank), nie
 * fremde Tasks der Queue. Der echte Worker wird nicht gebraucht; die Webhook-Zustellung macht das echte Test-Gateway.
 */
import { BACKEND_URL } from '../../env'
import { GATEWAY_API_KEY, GATEWAY_URL, type WorkerResult } from './gateway-worker'
import { makePng } from './png'

export interface UploadResult { status: number; photoId: number | null; photoStatus: string | null; text: string }

/** `POST /customer/reviews/{id}/photos` (multipart). `shade` macht die Pixel eindeutig. */
export async function uploadReviewPhoto(token: string, reviewId: number, shade: number): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(makePng(shade))], { type: 'image/png' }), `photo-${shade}.png`)
  const res = await fetch(`${BACKEND_URL}/api/v1/customer/reviews/${reviewId}/photos`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(60_000),
  })
  const text = await res.text()
  let json: { photo_id?: number; status?: string } = {}
  try { json = JSON.parse(text) } catch { /* kein JSON */ }
  return { status: res.status, photoId: json.photo_id ?? null, photoStatus: json.status ?? null, text }
}

export interface PhotoStatus { photo_id: number; status: string; moderation_reason: string | null; moderation_categories: string[] | null }

/** Kunden-Statusendpoint `GET /customer/reviews/{id}/photos/status`. */
export async function photoStatuses(token: string, reviewId: number): Promise<PhotoStatus[]> {
  const res = await fetch(`${BACKEND_URL}/api/v1/customer/reviews/${reviewId}/photos/status`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`photo status -> HTTP ${res.status}`)
  return (await res.json()) as PhotoStatus[]
}

/** Least genau den eigenen Task (Task-ID); null, wenn er nicht (mehr) in der Queue wartet. */
export async function leaseTaskById(taskId: string, timeoutMs = 15_000): Promise<{ task_id: string; payload: Record<string, unknown> } | null> {
  const qs = new URLSearchParams({ worker_id: 'playwright-e2e', task_id: taskId })
  qs.append('job_type', 'moderate.review_photo')
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const res = await fetch(`${GATEWAY_URL}/v1/tasks/next?${qs}`, { headers: { 'X-Internal-API-Key': GATEWAY_API_KEY } })
    if (res.status === 200) return (await res.json()) as { task_id: string; payload: Record<string, unknown> }
    if (res.status !== 204) throw new Error(`Gateway /next -> HTTP ${res.status}: ${await res.text()}`)
    await new Promise((r) => setTimeout(r, 400))
  }
  return null
}

/** Ergebnis in der Huelle des echten Workers (`{output, raw}`, Form wie Golden `moderate.review_photo.json`). */
export function moderationResult(output: { approved: boolean; confidence: number; reason: string | null; categories: string[] }): WorkerResult {
  return { output, raw: JSON.stringify(output) }
}

/** Wartet, bis das Gateway den Webhook des Tasks zugestellt hat (Task-Zeile `webhook_status`). */
export async function waitWebhookDelivered(taskId: string, timeoutMs = 20_000): Promise<string> {
  const end = Date.now() + timeoutMs
  let last = 'unknown'
  while (Date.now() < end) {
    const res = await fetch(`${GATEWAY_URL}/v1/tasks/${taskId}`, { headers: { 'X-Internal-API-Key': GATEWAY_API_KEY } })
    if (res.ok) {
      last = String(((await res.json()) as { webhook_status?: string | null }).webhook_status ?? 'none')
      if (last === 'delivered') return last
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return last
}
