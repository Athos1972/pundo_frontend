'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { tAdmin } from '@/lib/shop-admin-translations'
import { isRTL } from '@/lib/lang'
import type { Lang } from '@/lib/lang'
import {
  loadDraft, saveDraft, clearDraft, draftAgeMs,
} from '@/lib/onboarding/draftStorage'
import { submitOnboarding, uploadOnboardingPhoto } from '@/lib/onboarding/onboardingApi'
import type {
  OnboardingProviderType, OnboardingContact, OnboardingLocation, OnboardingDraft,
} from '@/types/shop-admin'

import { OnboardingProgress } from './OnboardingProgress'
import { OnboardingDraftBanner } from './OnboardingDraftBanner'
import { StepProviderType } from './StepProviderType'
import { StepDomains } from './StepDomains'
import { StepLocation } from './StepLocation'
import { StepContact } from './StepContact'
import { StepPhoto } from './StepPhoto'
import { StepCredentials } from './StepCredentials'

const TOTAL_STEPS = 6

const EMPTY_DRAFT: Omit<OnboardingDraft, 'version' | 'expiresAt'> = {
  providerType: null,
  domainSlugs: [],
  specialtySlugs: [],
  location: null,
  contact: {},
}

interface OnboardingWizardProps {
  lang: string
}

export function OnboardingWizard({ lang }: OnboardingWizardProps) {
  const tr = tAdmin(lang)
  const rtl = isRTL(lang as Lang)
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeOAuth = searchParams.get('resume') === 'oauth'

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Omit<OnboardingDraft, 'version' | 'expiresAt'>>(EMPTY_DRAFT)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  // SSR-safe: start hidden, reveal on client after localStorage read (avoids hydration mismatch)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [draftAge, setDraftAge] = useState(0)

  useEffect(() => {
    if (resumeOAuth) return
    if (loadDraft() !== null) {
      setShowDraftBanner(true)
      setDraftAge(draftAgeMs() ?? 0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [emailTakenError, setEmailTakenError] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // OAuth auto-submit: triggered when callback redirects back with ?resume=oauth
  useEffect(() => {
    if (!resumeOAuth) return
    const saved = loadDraft()
    if (!saved?.providerType || !saved?.location) return
    startTransition(async () => {
      try {
        await submitOnboarding({
          providerType: saved.providerType!,
          domainSlugs: saved.domainSlugs,
          specialtySlugs: saved.specialtySlugs,
          location: saved.location!,
          contact: saved.contact,
          credentials: { type: 'google' },
        })
        clearDraft()
        router.push('/shop-admin/register/check-email')
      } catch {
        setSubmitError(tr.onboarding_error_oauth_failed)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleResumeDraft() {
    const saved = loadDraft()
    if (!saved) return
    setDraft({
      providerType: saved.providerType,
      domainSlugs: saved.domainSlugs,
      specialtySlugs: saved.specialtySlugs,
      location: saved.location,
      contact: saved.contact,
    })
    setShowDraftBanner(false)
    // Resume at the furthest completed step
    if (saved.contact && Object.keys(saved.contact).length > 0) setStep(4)
    else if (saved.location) setStep(3)
    else if (saved.domainSlugs.length > 0) setStep(2)
    else if (saved.providerType) setStep(1)
  }

  function handleDiscardDraft() {
    clearDraft()
    setShowDraftBanner(false)
  }

  function persistDraft(updates: Partial<typeof draft>) {
    const next = { ...draft, ...updates }
    setDraft(next)
    saveDraft(next)
    return next
  }

  // Step handlers
  function handleStep1Next(providerType: OnboardingProviderType) {
    persistDraft({ providerType })
    setStep(1)
  }

  function handleStep2Next(domainSlugs: string[], specialtySlugs: string[]) {
    persistDraft({ domainSlugs, specialtySlugs })
    setStep(2)
  }

  function handleStep3Next(location: OnboardingLocation) {
    persistDraft({ location })
    setStep(3)
  }

  function handleStep4Next(contact: OnboardingContact) {
    persistDraft({ contact })
    setStep(4)
  }

  function handleStep5Next(file: File | null) {
    setPhotoFile(file)
    setStep(5)
  }

  function handleFinalSubmit(email: string, password: string) {
    setEmailTakenError(false)
    setSubmitError(null)
    if (!draft.providerType || !draft.location) return

    startTransition(async () => {
      try {
        const result = await submitOnboarding({
          providerType: draft.providerType!,
          domainSlugs: draft.domainSlugs,
          specialtySlugs: draft.specialtySlugs,
          location: draft.location!,
          contact: draft.contact,
          credentials: { email, password },
        })
        if (photoFile) {
          try { await uploadOnboardingPhoto(photoFile) } catch { /* non-fatal */ }
        }
        clearDraft()
        // Pass shop_id so portal can use it
        void result
        router.push('/shop-admin/register/check-email')
      } catch (err) {
        const code = (err as { code?: string }).code
        if (code === 'EMAIL_TAKEN') {
          setEmailTakenError(true)
        } else {
          setSubmitError(tr.onboarding_error_generic)
        }
      }
    })
  }

  async function handleOAuthSubmit() {
    if (!draft.providerType || !draft.location) return
    startTransition(async () => {
      try {
        const result = await submitOnboarding({
          providerType: draft.providerType!,
          domainSlugs: draft.domainSlugs,
          specialtySlugs: draft.specialtySlugs,
          location: draft.location!,
          contact: draft.contact,
          credentials: { type: 'google' },
        })
        if (photoFile) {
          try { await uploadOnboardingPhoto(photoFile) } catch { /* non-fatal */ }
        }
        clearDraft()
        void result
        router.push('/shop-admin/register/check-email')
      } catch (err) {
        setSubmitError(tr.onboarding_error_oauth_failed)
      }
    })
  }

  function handleClose() {
    try { router.back() } catch { router.push('/shop-admin/login') }
  }

  if (showDraftBanner) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <OnboardingDraftBanner
          tr={tr}
          ageMs={draftAge}
          onResume={handleResumeDraft}
          onDiscard={handleDiscardDraft}
        />
      </div>
    )
  }

  const progressLabel = tr.onboarding_progress
    .replace('{step}', String(step + 1))
    .replace('{total}', String(TOTAL_STEPS))

  return (
    <div className="flex flex-col gap-5" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-2 px-1">
        {/* Header row: back/close on step 0, progress label on the right */}
        <div className="flex items-center justify-between">
          {step === 0 ? (
            <button
              type="button"
              onClick={handleClose}
              aria-label={tr.onboarding_close}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors rtl:flex-row-reverse"
            >
              <span aria-hidden>←</span>
              <span>{tr.onboarding_close}</span>
            </button>
          ) : (
            <span />
          )}
          <p className="text-xs text-gray-400">{progressLabel}</p>
        </div>
        <OnboardingProgress step={step + 1} total={TOTAL_STEPS} isRtl={rtl} />
      </div>

      <div className="px-1">
        {step === 0 && (
          <StepProviderType
            tr={tr}
            selected={draft.providerType}
            onAutoSelect={handleStep1Next}
          />
        )}
        {step === 1 && draft.providerType && (
          <StepDomains
            tr={tr}
            lang={lang}
            providerType={draft.providerType}
            selectedDomainSlugs={draft.domainSlugs}
            selectedSpecialtySlugs={draft.specialtySlugs}
            onNext={handleStep2Next}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepLocation
            tr={tr}
            initialLocation={draft.location}
            onNext={handleStep3Next}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepContact
            tr={tr}
            initialContact={draft.contact}
            onNext={handleStep4Next}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepPhoto
            tr={tr}
            initialFile={photoFile}
            onNext={handleStep5Next}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <StepCredentials
            tr={tr}
            emailTakenError={emailTakenError}
            submitError={submitError}
            isPending={isPending}
            onSubmit={handleFinalSubmit}
            onBack={() => setStep(4)}
          />
        )}
      </div>
    </div>
  )
}
