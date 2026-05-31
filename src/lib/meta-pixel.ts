export const PixelEvents = {
  PageView: 'PageView',
  Search: 'Search',
  ViewContent: 'ViewContent',
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
