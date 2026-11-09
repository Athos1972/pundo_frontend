export const PixelEvents = {
  PageView: 'PageView',
  Search: 'Search',
  ViewContent: 'ViewContent',
  CompleteRegistration: 'CompleteRegistration',
} as const

export type PixelEventName = typeof PixelEvents[keyof typeof PixelEvents]

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function trackPixelEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  if (params) {
    window.fbq('track', eventName, params)
  } else {
    window.fbq('track', eventName)
  }
}

/**
 * Init snippet for the Meta Pixel (shared by the customer layout's MetaPixel and
 * the shop-admin wrapper). Callers MUST only render it after marketing consent.
 */
export function buildMetaPixelInitScript(pixelId: string): string {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('consent','grant');fbq('init','${pixelId}');fbq('track','PageView');`
}

const REGISTRATION_KEY_PREFIX = 'pundo_pixel_reg_'
const sentRegistrations = new Set<string>()

/**
 * Fires the standard event `CompleteRegistration` at most once per registration.
 * Call ONLY after the backend confirmed the registration (HTTP OK).
 * `registrationId` identifies the registration (shop id from the backend response);
 * dedupe survives re-renders (module Set) and reloads (sessionStorage).
 * Returns true if the event was sent.
 */
export function trackCompleteRegistrationOnce(registrationId: string | number): boolean {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return false
  const id = String(registrationId)
  const key = REGISTRATION_KEY_PREFIX + id
  if (sentRegistrations.has(id)) return false
  try {
    if (window.sessionStorage.getItem(key)) {
      sentRegistrations.add(id)
      return false
    }
    window.sessionStorage.setItem(key, '1')
  } catch {
    /* storage unavailable: module Set still protects against re-renders */
  }
  sentRegistrations.add(id)
  trackPixelEvent(PixelEvents.CompleteRegistration)
  return true
}

/** Test helper: resets the in-memory dedupe state. */
export function _resetRegistrationDedupeForTests(): void {
  sentRegistrations.clear()
}
