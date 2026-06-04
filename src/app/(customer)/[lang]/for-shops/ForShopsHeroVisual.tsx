/**
 * ForShopsHeroVisual — decorative dashboard mockup for the For-Shops hero.
 * Server Component, aria-hidden="true". All strings are decorative hardcodes.
 * No i18n needed — this element is invisible to assistive technology.
 */
export function ForShopsHeroVisual({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      role="presentation"
    >
      {/* Browser chrome frame */}
      <div className="relative bg-surface rounded-2xl border border-border shadow-xl overflow-hidden">
        {/* Browser top bar */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-surface-alt border-b border-border">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          <div className="flex-1 mx-3 bg-border rounded-full h-4" />
        </div>

        {/* Content area */}
        <div className="p-4 space-y-3">
          {/* Shop name header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 w-32 bg-text rounded-sm mb-1" />
              <div className="h-3 w-20 bg-border rounded-sm" />
            </div>
            {/* Live badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-xs font-semibold rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Live
            </span>
          </div>

          {/* Mini map */}
          <div className="relative bg-surface-alt rounded-lg h-24 overflow-hidden border border-border">
            {/* Map grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            {/* Roads */}
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-surface opacity-60" />
              <div className="absolute left-1/3 top-0 bottom-0 w-[2px] bg-surface opacity-60" />
            </div>
            {/* Map pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg">
                <div className="w-2 h-2 bg-surface rounded-full" />
              </div>
              <div className="w-2 h-2 bg-accent mx-auto -mt-0.5 clip-triangle" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Views', value: '284', trend: '+12%' },
              { label: 'Clicks', value: '47', trend: '+8%' },
              { label: 'Growth', value: '↑', trend: '+5%' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-alt rounded-lg p-2">
                <div className="text-xs text-text-muted">{stat.label}</div>
                <div className="text-sm font-bold text-text font-display">{stat.value}</div>
                <div className="text-[10px] text-success">{stat.trend}</div>
              </div>
            ))}
          </div>

          {/* Product rows */}
          {[
            { name: 'Samsung 65" QLED', price: '€749', badge: 'In stock' },
            { name: 'Sony WH-1000XM5', price: '€279', badge: 'Offer' },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-accent-light flex items-center justify-center text-xs">📦</div>
                <div>
                  <div className="text-xs font-medium text-text">{item.name}</div>
                  <div className="text-[10px] text-text-muted">{item.badge}</div>
                </div>
              </div>
              <div className="text-sm font-bold text-accent">{item.price}</div>
            </div>
          ))}
        </div>

        {/* Floating badge — top right */}
        <div className="absolute top-12 -right-2 bg-accent text-surface text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
          🔥 3 new searches today
        </div>

        {/* Floating card — bottom left */}
        <div className="absolute -bottom-2 -left-2 bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
          <div className="flex items-center gap-1">
            {/* star colour: decorative, using text-[#D4911A] — see §4 */}
            <span className="text-[#D4911A]">★★★★★</span>
            <span className="font-semibold text-text">4.8</span>
            <span className="text-text-muted">· 21 reviews</span>
          </div>
        </div>
      </div>
    </div>
  )
}
