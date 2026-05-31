'use client'

import { useState } from 'react'
import { SearchSimilarButton } from '@/components/search/SearchSimilarButton'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import type { Lang } from '@/lib/lang'

interface Props {
  lang: Lang
  brandSlug: string
  recentlyViewed: 'hidden' | 'home' | 'drawer'
}

export function HomesickAndBar({ lang, brandSlug, recentlyViewed }: Props) {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const hasBottomBar = recentlyViewed === 'drawer'

  return (
    <>
      <SearchSimilarButton
        lang={lang}
        brandSlug={brandSlug}
        hasBottomBar={hasBottomBar}
        onOverlayChange={setOverlayOpen}
      />
      <BottomTabBar
        lang={lang}
        recentlyViewed={recentlyViewed}
        hidden={overlayOpen}
      />
    </>
  )
}
