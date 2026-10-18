// F6998 — Besucher-User-Agent an das Backend weiterreichen.
//
// SSR-Fetches (Node) und die Customer-Proxy-Route haben als Peer-UA nur `node`.
// Damit das Backend Bot-Aufrufe (Crawler, Link-Previews, Lighthouse, ...) nicht
// als Activity-Event loggt, senden wir den UA des EINGEHENDEN Requests als
// `X-Forwarded-User-Agent`. Wirkung im Backend: ausschliesslich Unterdrueckung
// des Activity-Loggings (Monotonie: ein Header kann nur unterdruecken, nie
// erzwingen). Ein eingehender `X-Forwarded-User-Agent` wird nie gelesen/durchgereicht.
//
// Reiner Infrastruktur-Helfer ohne Next-Import (analog client-ip.ts).

export const FORWARDED_UA_HEADER = 'X-Forwarded-User-Agent'
export const MAX_FORWARDED_UA_LENGTH = 512

export function forwardedUserAgentValue(incoming: Headers): string {
  const ua = incoming.get('user-agent') ?? ''
  // fetch() wirft bei Nicht-ByteString-Headerwerten: alles ausserhalb 0x20-0x7E (und Tab) -> '?'
  const safe = ua.replace(/[^\t\x20-\x7e]/g, '?')
  return safe.slice(0, MAX_FORWARDED_UA_LENGTH).trim()
}

/** Auch bei leerem UA ein Header mit '' (Design 2.5: leerer UA = Bot). */
export function forwardedUserAgentHeaders(incoming: Headers): Record<string, string> {
  return { [FORWARDED_UA_HEADER]: forwardedUserAgentValue(incoming) }
}

export const FORWARDED_PREFETCH_HEADER = 'X-Forwarded-Prefetch'

/**
 * B6998-001: Next-Link-Prefetch rendert Detailseiten, ohne dass sie je geoeffnet werden. Das Backend soll dafuer
 * kein Activity-Event loggen (Wirkung dort: nur Unterdrueckung, ein Header kann nie Logging erzwingen).
 *
 * Der Marker kommt NICHT aus den Request-Headern: Next entfernt `rsc`/`next-router-prefetch` aus `headers()`
 * und aus dem Proxy (empirisch geprueft, Next 16.4). Die Quelle ist daher das Flag des Next-Render-Kontexts
 * (siehe `isNextPrefetchRender` in api.ts). Ein eingehender `X-Forwarded-Prefetch` wird nie gelesen.
 * Bei Nicht-Prefetch `{}` -> Request identisch zu bisher (Memoization, Cache-Key).
 */
export function forwardedPrefetchHeaders(isPrefetch: boolean): Record<string, string> {
  return isPrefetch ? { [FORWARDED_PREFETCH_HEADER]: '1' } : {}
}
