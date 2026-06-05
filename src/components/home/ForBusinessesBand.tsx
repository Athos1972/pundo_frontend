// src/components/home/ForBusinessesBand.tsx — Server Component
import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { tHome } from '@/lib/translations'

interface Props {
  lang: Lang
}

export function ForBusinessesBand({ lang }: Props) {
  const tr = tHome(lang)

  return (
    <section className="py-6 px-6">
      <div
        className="relative bg-text rounded-[24px] px-8 sm:px-10 py-12 sm:py-14 overflow-hidden"
      >
        {/* Radial gradient overlays — classes defined in globals.css (CSP-safe, no inline style) */}
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none biz-band-glow-top" />
        <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none biz-band-glow-bottom" />

        {/* Content — 2-column on desktop, stacked on mobile */}
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8 rtl:flex-row-reverse">
          {/* Text side */}
          <div className="space-y-4 max-w-lg">
            {/* Eyebrow chip */}
            <div className="inline-flex">
              <span
                className="biz-eyebrow-chip text-xs font-semibold text-accent uppercase tracking-widest px-3 py-1 rounded-full"
              >
                {tr.for_biz_eyebrow}
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
              {tr.for_biz_title}
            </h2>

            <p className="text-white/55 text-sm sm:text-base leading-relaxed">
              {tr.for_biz_sub}
            </p>

            {/* Business-type chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[tr.for_biz_chip_retailers, tr.for_biz_chip_trades, tr.for_biz_chip_services].map((chip) => (
                <span
                  key={chip}
                  className="text-xs text-white/70 border border-white/20 rounded-full px-3 py-1"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* CTA side — /shop-admin/register is a bypass path, no localePath */}
          <div className="flex-shrink-0">
            <Link
              href="/shop-admin/register"
              className="inline-flex items-center gap-2 bg-accent text-white font-semibold rounded-lg px-6 py-3 hover:bg-accent/90 transition-colors"
            >
              {tr.for_biz_cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
