// =============================================================================
// src/components/activity-feed/LiveDot.tsx
//
// Pulsing live indicator for the naidivse activity feed header.
// Uses CSS animations from globals.css (ping-slow + Tailwind animate-pulse).
// =============================================================================

interface LiveDotProps {
  ariaLabel: string
}

export function LiveDot({ ariaLabel }: LiveDotProps) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="relative inline-flex items-center justify-center w-3 h-3 shrink-0"
    >
      {/* Outer ping ring */}
      <span
        className="absolute inline-flex w-full h-full rounded-full bg-success opacity-40 animate-ping-slow"
        aria-hidden="true"
      />
      {/* Inner solid dot */}
      <span
        className="relative inline-flex w-2 h-2 rounded-full bg-success animate-pulse"
        aria-hidden="true"
      />
    </span>
  )
}
