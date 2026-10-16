// Small helpers shared by the review components (F5930). No customer-code imports (Clean Boundary).

/** Replaces `{name}` placeholders in a translated string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), template)
}

export function formatDate(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** `{"detail":{"code":"reply_exists"}}` -> `reply_exists`; null for anything else (e.g. FastAPI 422 lists). */
export async function errorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { detail?: { code?: unknown } }
    return typeof body?.detail?.code === 'string' ? body.detail.code : null
  } catch {
    return null
  }
}
