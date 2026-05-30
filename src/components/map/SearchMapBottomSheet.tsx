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

// translateY values as % of sheet height.
// Sheet height = container height − 60px (60px of map always visible above).
// Using % units means all calculations are container-relative, not viewport-relative.
// → The drag handle is ALWAYS accessible: at full (0%), handle is 0px from container top
//   = right below the sticky header. At peek (72%), ≈28% of list visible.
const SNAP_VH: Record<SheetSnap, number> = { peek: 72, half: 42, full: 0 }

// Exported for unit tests
export function nearestSnap(y: number): SheetSnap {
  const candidates: [SheetSnap, number][] = [
    ['full', Math.abs(y)],
    ['half', Math.abs(y - 42)],
    ['peek', Math.abs(y - 72)],
  ]
  return candidates.reduce((a, b) => (a[1] <= b[1] ? a : b))[0]
}

export function SearchMapBottomSheet({ snap, onSnapChange, children, scrollContainerRef, ariaLabel }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragDeltaPx, setDragDeltaPx] = useState(0)
  const dragStartY = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const baseVh = SNAP_VH[snap]
  // Use the sheet's own clientHeight for drag calculation so everything is container-relative.
  // Falls back to 600 (reasonable mobile estimate) if the ref isn't attached yet.
  const sheetH = sheetRef.current?.clientHeight ?? 600
  const deltaVh = isDragging ? (dragDeltaPx / sheetH) * 100 : 0
  const currentVh = Math.max(0, Math.min(72, baseVh + deltaVh))

  // translateY(X%) is relative to the element itself → fully container-relative.
  // useLayoutEffect fires before paint → no visible flash.
  useLayoutEffect(() => {
    const el = sheetRef.current
    if (!el) return
    el.style.transform = `translateY(${currentVh}%)`
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
    const h = sheetRef.current?.clientHeight ?? 600
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
      // sheet-body: height calc(100% - 60px) — defined in globals.css (avoids CSP inline-style hash)
      className="absolute bottom-0 left-0 right-0 bg-bg rounded-t-2xl z-10 flex flex-col sheet-elevation sheet-body"
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

      {/* sheet-scroll-area: padding-bottom = max(1.5rem, safe-area-inset-bottom) — in globals.css */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 space-y-3 pt-1 sheet-scroll-area"
      >
        {children}
      </div>
    </div>
  )
}
