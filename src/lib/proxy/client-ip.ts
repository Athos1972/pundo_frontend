// B6220-002 — Client-IP trust chain, Frontend hop.
//
// nginx sets X-Forwarded-For to $remote_addr (real client IP after the
// Cloudflare realip module). Before that nginx change is live it APPENDS
// $remote_addr instead. In both cases the RIGHTMOST entry is the one written
// by our own nginx; everything to the left (and CF-Connecting-IP / X-Real-IP /
// Forwarded) is client-controlled and must never be trusted or forwarded.
//
// Route handlers send exactly one validated IP to the backend as
// `X-Forwarded-For`. If the rightmost entry is missing/invalid, nothing is sent
// (no fallback to entries further left).
//
// Pure infrastructure helper (node:net only) — also used by the shop-admin
// proxy route (accepted exception to the clean boundary, B6220-002 E5).

import { isIP } from 'node:net'

const MAX_HEADER_LENGTH = 1024

export function getClientIp(headers: Headers): string | undefined {
  const raw = headers.get('x-forwarded-for')
  if (!raw || raw.length > MAX_HEADER_LENGTH) return undefined
  const parts = raw.split(',')
  const last = parts[parts.length - 1]?.trim()
  if (!last) return undefined
  return isIP(last) !== 0 ? last : undefined
}

export function clientIpForwardHeaders(headers: Headers): Record<string, string> {
  const ip = getClientIp(headers)
  return ip ? { 'X-Forwarded-For': ip } : {}
}
