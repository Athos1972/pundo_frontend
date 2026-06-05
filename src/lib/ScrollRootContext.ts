// Context that provides the nearest overflow scroll container to descendants.
// Used by ProductCardImage to implement IntersectionObserver-based lazy loading
// that respects nested scroll containers (window-level `loading="lazy"` doesn't
// fire for images inside overflow:auto/scroll containers — B2250-002/B2250-003).
//
// Pass a React.RefObject — the ref is stable across renders, so the context value
// never changes identity even when .current gets populated after mount.
import { createContext, useContext, type RefObject } from 'react'

export const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null)

export function useScrollRoot(): HTMLElement | null {
  return useContext(ScrollRootContext)?.current ?? null
}
