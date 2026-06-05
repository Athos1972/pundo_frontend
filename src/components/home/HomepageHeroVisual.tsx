// src/components/home/HomepageHeroVisual.tsx — Server Component
// Purely decorative: aria-hidden="true", no state, no 'use client'

// delay is set via CSS class (float-card-delay-N) in globals.css — NOT via style={} (CSP violation)
interface FloatCard {
  initial: string
  name: string
  category: string
  distance: string
  badge: string
  badgeColor: string
  position: string
  delayClass: string
}

const FLOAT_CARDS: FloatCard[] = [
  {
    initial: 'A',
    name: 'Alkioni Bakery',
    category: 'Bakery & Café',
    distance: '0.3 km',
    badge: 'Open now',
    badgeColor: 'bg-success/20 text-success',
    position: 'top-4 left-0',
    delayClass: 'float-card-delay-1',
  },
  {
    initial: 'P',
    name: 'Petrou Electrics',
    category: 'Tradespeople',
    distance: '1.2 km',
    badge: 'New',
    badgeColor: 'bg-accent/20 text-accent',
    position: 'bottom-16 right-0',
    delayClass: 'float-card-delay-2',
  },
  {
    initial: 'S',
    name: 'SunSet Pharmacy',
    category: 'Health & Wellness',
    distance: '0.8 km',
    badge: 'Open now',
    badgeColor: 'bg-success/20 text-success',
    position: 'top-1/2 -translate-y-1/2 right-4',
    delayClass: 'float-card-delay-3',
  },
]

interface Props {
  className?: string
}

export function HomepageHeroVisual({ className }: Props) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center ${className ?? ''}`}
    >
      {/* Glow background — class defined in globals.css (CSP-safe, no inline style) */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none hero-glow-bg" />

      {/* Cyprus SVG — simplified but recognisable outline; delay 0s = CSS default, no inline style needed */}
      <div className="relative w-full max-w-sm animate-[floatMap_6s_ease-in-out_infinite]">
        <svg
          viewBox="0 0 480 260"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto drop-shadow-md"
        >
          {/* Cyprus island body */}
          <path
            d="M60,160 C70,140 85,125 100,115 C115,105 130,100 148,95
               C160,92 172,90 185,88 C200,86 215,85 228,82
               C240,79 250,74 265,72 C278,70 292,71 305,73
               C318,75 330,79 342,84 C355,89 368,96 378,104
               C390,113 400,123 408,132 C416,141 422,150 425,158
               C428,166 428,173 424,179
               C420,185 412,189 402,192
               C390,195 376,196 362,196
               C348,196 334,194 320,191
               C306,188 292,184 278,182
               C264,180 250,180 236,181
               C222,182 208,185 194,187
               C180,189 166,190 152,188
               C138,186 124,181 112,175
               C100,169 88,161 78,156
               C68,151 58,148 52,150
               C46,152 44,160 46,168
               C48,172 52,165 60,160 Z"
            fill="var(--color-surface-alt)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Karpaz peninsula (eastern finger) */}
          <path
            d="M408,132 C418,125 428,118 438,112
               C448,106 458,101 465,98
               C470,96 473,96 472,100
               C471,104 466,110 460,116
               C454,122 446,128 438,133
               C430,138 422,142 415,144
               C410,146 406,145 405,141
               C404,137 406,135 408,132 Z"
            fill="var(--color-surface-alt)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          {/* Troodos mountains — subtle ridge */}
          <path
            d="M200,130 C210,115 225,108 240,110 C255,112 268,120 278,130"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M215,118 L230,100 L245,112"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeLinejoin="round"
            opacity="0.4"
          />

          {/* City dots */}
          {/* Nicosia (capital — centre-north) */}
          <circle cx="248" cy="108" r="5" fill="var(--color-accent)" />
          <text x="256" y="106" fontSize="9" fill="var(--color-text-muted)" fontFamily="sans-serif">Nicosia</text>

          {/* Limassol (south coast) */}
          <circle cx="240" cy="168" r="5" fill="var(--color-accent)" />
          <text x="248" y="166" fontSize="9" fill="var(--color-text-muted)" fontFamily="sans-serif">Limassol</text>

          {/* Paphos (south-west) */}
          <circle cx="115" cy="158" r="4" fill="var(--color-accent)" />
          <text x="88" y="152" fontSize="9" fill="var(--color-text-muted)" fontFamily="sans-serif">Paphos</text>

          {/* Larnaca (south-east) */}
          <circle cx="330" cy="165" r="4" fill="var(--color-accent)" />
          <text x="338" y="163" fontSize="9" fill="var(--color-text-muted)" fontFamily="sans-serif">Larnaca</text>
        </svg>

        {/* Floating shop cards */}
        {FLOAT_CARDS.map((card) => (
          <div
            key={card.name}
            className={`absolute ${card.position} ${card.delayClass} bg-surface border border-border rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 min-w-[160px] animate-[floatMap_6s_ease-in-out_infinite]`}
          >
            {/* Logo initial */}
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-accent">{card.initial}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text truncate">{card.name}</p>
              <p className="text-[10px] text-text-muted truncate">{card.category} · {card.distance}</p>
            </div>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-auto ${card.badgeColor} whitespace-nowrap`}>
              {card.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
