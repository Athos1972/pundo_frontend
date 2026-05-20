/**
 * absolutizeImageUrl — converts a relative or absolute image URL to an absolute URL.
 *
 * Rules:
 *   null          → null
 *   starts with https:// or http:// → unchanged
 *   starts with /  → `${siteUrl}${url}`
 *   anything else  → null  (defensive; no relative non-root paths expected)
 */
export function absolutizeImageUrl(
  url: string | null | undefined,
  siteUrl: string,
): string | null {
  if (!url) return null
  if (url.startsWith('https://') || url.startsWith('http://')) return url
  if (url.startsWith('/')) return `${siteUrl.replace(/\/$/, '')}${url}`
  return null
}
