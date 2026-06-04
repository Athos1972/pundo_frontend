import { getLangServer } from '@/lib/lang'
import { OnboardingWizard } from '@/components/shop-admin/onboarding/OnboardingWizard'
import { Suspense } from 'react'

export const metadata = { title: 'Jetzt registrieren | Pundo' }

export default async function OnboardingPage() {
  const lang = await getLangServer()
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-4 py-8">
      {/* Focused onboarding header — logo only, no customer nav */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <a href={`/${lang}`} aria-label="pundo — back to home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brands/pundo/logo.svg" alt="pundo" className="h-10 w-auto" />
        </a>
        <a
          href={`/${lang}/for-shops`}
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          ← Back
        </a>
      </div>

      <div className="w-full max-w-md bg-surface rounded-2xl shadow-sm border border-border p-6 flex flex-col gap-5">
        <Suspense>
          <OnboardingWizard lang={lang} />
        </Suspense>
      </div>
    </div>
  )
}
