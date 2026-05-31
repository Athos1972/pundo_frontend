'use client'

import { useState } from 'react'
import { SearchSimilarModal } from './SearchSimilarModal'
import { HomesickIcon } from './HomesickIcon'
import { FABOnboardingPopout } from '@/components/ui/FABOnboardingPopout'
import { useFabOnboarding } from '@/lib/useFabOnboarding'
import { t } from '@/lib/translations'
import { useLang } from '@/lib/useLang'
import type { Lang } from '@/lib/lang'

interface Props {
  lang: Lang
  brandSlug: string
  hasBottomBar?: boolean
  onOverlayChange?: (open: boolean) => void
}

export function SearchSimilarButton({ lang, brandSlug, hasBottomBar = false, onOverlayChange }: Props) {
  const [open, setOpen] = useState(false)
  const currentLang = useLang(lang)
  const tr = t(currentLang)

  // Brand-specific timing: naidivse = 3 s / no auto-dismiss; pundo = 5 s / 8 s auto-dismiss
  const isNaidivse = brandSlug === 'naidivse'
  const delayMs = isNaidivse ? 3000 : 5000
  const autoDismissMs = isNaidivse ? undefined : 8000

  const { visible: onboardingVisible, dismiss: dismissOnboarding } = useFabOnboarding({
    storageKey: 'fab_homesick_onboarding_shown',
    delayMs,
    autoDismissMs,
  })

  function handleClick() {
    dismissOnboarding()
    setOpen(true)
    onOverlayChange?.(true)
  }

  function handleClose() {
    setOpen(false)
    onOverlayChange?.(false)
  }

  const fabLabel = isNaidivse ? tr.fab_homesick_label_naidivse : tr.fab_homesick_label_pundo

  // Color classes per brand
  const fabColorClasses = isNaidivse
    ? 'bg-accent-dark text-white'
    : 'bg-surface border border-accent-dark text-accent-dark'

  const pulseClass = isNaidivse && onboardingVisible ? 'animate-pulse' : ''

  const bottomClass = hasBottomBar
    ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]'

  return (
    // Relative container so the popout can be positioned absolutely above the FAB
    <div className={`fixed ${bottomClass} end-4 z-[45]`}>
      <div className="relative">
        <FABOnboardingPopout
          text={tr.fab_homesick_onboarding_text}
          visible={onboardingVisible}
          onDismiss={dismissOnboarding}
          dismissLabel={tr.fab_dismiss_label}
        />

        {/* Mobile: round button; Desktop (md+): pill with label */}
        <button
          onClick={handleClick}
          aria-label={tr.search_similar_button_label}
          title={tr.search_similar_button_label}
          className={[
            'flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform',
            // Mobile: circle
            'w-14 h-14 rounded-full',
            // Desktop: pill
            'md:w-auto md:h-14 md:rounded-full md:px-4',
            fabColorClasses,
            pulseClass,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <HomesickIcon className="w-6 h-6 shrink-0" />
          <span className="hidden md:inline text-sm font-medium whitespace-nowrap">
            {fabLabel}
          </span>
        </button>
      </div>

      <SearchSimilarModal lang={currentLang} isOpen={open} onClose={handleClose} />
    </div>
  )
}
