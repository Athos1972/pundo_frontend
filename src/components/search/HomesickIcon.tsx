// Transition icon for Homesick / AI Search FAB.
// Composed SVG: magnifying glass + sparkle overlay top-right.
// Custom brand asset will replace this when ready.

interface HomesickIconProps {
  className?: string
}

export function HomesickIcon({ className = 'w-6 h-6' }: HomesickIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Magnifying glass */}
      <circle cx="10" cy="10" r="6" />
      <path d="M14.5 14.5 L19 19" strokeLinecap="round" />
      {/* Sparkle overlay top-right */}
      <path
        d="M18 4 L18.6 5.4 L20 6 L18.6 6.6 L18 8 L17.4 6.6 L16 6 L17.4 5.4 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}
