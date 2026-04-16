import { useEffect, useRef, useState } from 'react'

const PREFETCH_MARGIN = '0px 0px 200px 0px'

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  rootRef: React.RefObject<HTMLElement | null>
}

interface UseInfiniteScrollResult {
  sentinelRef: React.RefObject<HTMLDivElement | null>
  isSupported: boolean
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootRef,
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const [isSupported] = useState(() => typeof IntersectionObserver !== 'undefined')
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isSupported || !hasMore || isLoading) return

    const root = rootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { root, rootMargin: PREFETCH_MARGIN, threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [onLoadMore, hasMore, isLoading, isSupported, rootRef])

  return { sentinelRef, isSupported }
}
