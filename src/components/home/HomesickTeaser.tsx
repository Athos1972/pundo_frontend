'use client'

import { useState } from 'react'
import { SearchSimilarModal } from '@/components/search/SearchSimilarModal'
import { HomesickIcon } from '@/components/search/HomesickIcon'
import { t } from '@/lib/translations'
import type { BrandConfig } from '@/config/brands/types'

interface HomesickTeaserProps {
  brand: BrandConfig
  lang: string
  variant?: 'section' | 'page'
}

export function HomesickTeaser({ brand: _brand, lang, variant = 'section' }: HomesickTeaserProps) {
  const [open, setOpen] = useState(false)
  const tr = t(lang)

  return (
    <>
      <section
        className={[
          'bg-accent-dark text-white rounded-2xl mx-6 mb-8 p-6 flex flex-col gap-4',
          variant === 'page' ? 'max-w-2xl mx-auto mt-16' : 'max-w-6xl md:mx-auto',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <HomesickIcon className="w-8 h-8 shrink-0" />
          <h2 className="font-display text-lg font-bold leading-snug">
            {tr.homesick_teaser_headline}
          </h2>
        </div>

        <p className="text-sm opacity-90 leading-relaxed">
          {tr.homesick_teaser_text}
        </p>

        <button
          onClick={() => setOpen(true)}
          className="self-start bg-white text-accent-dark font-medium text-sm px-5 py-2.5 rounded-full hover:bg-surface-alt transition-colors active:scale-95 transition-transform"
        >
          {tr.homesick_teaser_cta}
        </button>
      </section>

      <SearchSimilarModal lang={lang} isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
