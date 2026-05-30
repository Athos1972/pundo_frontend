'use client'
import { useRef, useState, useCallback, useLayoutEffect } from 'react'

export type SheetSnap = 'peek' | 'half' | 'full'

interface Props {
  snap: SheetSnap
  onSnapChange: (s: SheetSnap) => void
  children: React.ReactNode
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
  ariaLabel?: string
}

// translateY values in dvh — how far the 90dvh-tall sheet is shifted down.
// dvh = Dynamic Viewport Height: adjusts when browser chrome (address bar,
// navigation bar) shows or hides. Unlike vh (layout viewport), dvh tracks
// the actually visible area → sheet never disappears behind browser chrome.
const SNAP_VH: Record<SheetSnap, number> = { peek: 75, half: 40, full: 0 }

// Exported for unit tests
export function nearestSnap(y: number): SheetSnap {
  const candidates: [SheetSnap, number][] = [
    ['full', Math.abs(y)],
    ['half', Math.abs(y - 40)],
    ['peek', Math.abs(y - 75)],
  ]
  return candidates.reduce((a, b) => (a[1] <= b[1] ? a : b))[0]
}

export function SearchMapBottomSheet({ snap, onSnapChange, children, scrollContainerRef, ariaLabel }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragDeltaPx, setDragDeltaPx] = useState(0)
  const dragStartY = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const baseVh = SNAP_VH[snap]
  // visualViewport.height is the actually visible height (excludes browser chrome).
  // Falls back to window.innerHeight on environments that don't support visualViewport.
  const viewH = typeof window !== 'undefined'
    ? (window.visualViewport?.height ?? window.innerHeight)
    : 800
  const deltaVh = isDragging ? (dragDeltaPx / viewH) * 100 : 0
  const currentVh = Math.max(0, Math.min(75, baseVh + deltaVh))

  // Apply transform using dvh units so the animation tracks the dynamic viewport.
  // useLayoutEffect fires before paint → no visible flash on state changes.
  useLayoutEffect(() => {
    const el = sheetRef.current
    if (!el) return
    el.style.transform = `translateY(${currentVh}dvh)`
    el.style.transition = isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
  }, [currentVh, isDragging])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartY.current = e.clientY
    setIsDragging(true)
    setDragDeltaPx(0)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    setDragDeltaPx(e.clientY - dragStartY.current)
  }, [])

  const handlePointerUp = useCallback(() => {
    if (dragStartY.current === null) return
    const h = typeof window !== 'undefined'
      ? (window.visualViewport?.height ?? window.innerHeight)
      : 800
    const delta = (dragDeltaPx / h) * 100
    const finalVh = Math.max(0, Math.min(75, baseVh + delta))
    dragStartY.current = null
    setIsDragging(false)
    setDragDeltaPx(0)
    onSnapChange(nearestSnap(finalVh))
  }, [dragDeltaPx, baseVh, onSnapChange])

  return (
    <div
      ref={sheetRef}
      role="region"
      aria-label={ariaLabel}
      className="absolute bottom-0 left-0 right-0 h-[90dvh] bg-bg rounded-t-2xl z-10 flex flex-col sheet-elevation"
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 flex items-center justify-center h-6 cursor-grab active:cursor-grabbing select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-hidden="true"
      >
        <div className="w-10 h-1 bg-border rounded-full" />
      </div>

      {/* Scrollable list content — padding-bottom respects iOS home-indicator safe area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 space-y-3 pt-1"
        style={{ paddingBottom: 'max(1.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {children}
      </div>
    </div>
  )
}
