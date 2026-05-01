import { getLangServer } from '@/lib/lang'
import { OnboardingWizard } from '@/components/shop-admin/onboarding/OnboardingWizard'
import { Suspense } from 'react'

export const metadata = { title: 'Jetzt registrieren | Pundo' }

export default async function OnboardingPage() {
  const lang = await getLangServer()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
        <Suspense>
          <OnboardingWizard lang={lang} />
        </Suspense>
      </div>
    </div>
  )
}
