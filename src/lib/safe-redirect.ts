// ─── Safe Redirect Helper ─────────────────────────────────────────────────────
// T1 — Phase 1 Security Hardening (F6990)
//
// Sanitizes a `next` query-param before using it as a redirect target.
// Only allows relative paths that start with /shop-admin/.
// All absolute URLs, protocol-relative URLs, backslashes, and non-shop-admin
// paths are rejected and replaced with the fallback.

export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback = '/shop-admin/dashboard',
): string {
  if (!raw) return fallback

  // Reject protocol-relative URLs: //evil.example
  if (raw.startsWith('//')) return fallback

  // Reject scheme URLs: http:// https:// javascript: data: etc.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return fallback

  // Must start with /
  if (!raw.startsWith('/')) return fallback

  // Reject backslashes (browser quirk: /\evil parsed as //evil on some browsers)
  if (raw.includes('\\')) return fallback

  // Only allow paths under /shop-admin/
  if (!raw.startsWith('/shop-admin/')) return fallback

  return raw
}
