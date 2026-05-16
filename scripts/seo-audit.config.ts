/**
 * SEO Audit configuration — pundo_frontend
 *
 * acceptedOrphans: URL paths that are intentionally orphaned (no internal inlinks).
 *   Per BB/16.5.: leer — alles soll mindestens einen internen Link haben.
 *
 * acceptedInternalRedirects: "from→to" pairs that are intentionally allowed as
 *   internal redirects (e.g. legacy URLs kept for external backlink compatibility).
 *   Per BB/16.5.: bestehende Redirect-Regeln bleiben für externe Backlinks, aber
 *   kein interner Link soll auf eine Redirect-URL zeigen.
 */

export const auditConfig = {
  acceptedOrphans: [] as string[],
  acceptedInternalRedirects: [] as string[],
  baseUrl: process.env.SEO_AUDIT_BASE_URL ?? 'http://localhost:3500',
}
