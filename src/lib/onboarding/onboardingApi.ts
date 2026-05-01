'use client'

import type { OnboardingSubmitPayload, OnboardingSubmitResponse } from '@/types/shop-admin'

export async function submitOnboarding(payload: OnboardingSubmitPayload): Promise<OnboardingSubmitResponse> {
  const res = await fetch('/api/shop-admin/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (res.status === 409) {
    const body = await res.json().catch(() => ({})) as { detail?: string }
    throw Object.assign(new Error(body.detail ?? 'EMAIL_TAKEN'), { code: 'EMAIL_TAKEN' })
  }
  if (!res.ok) {
    throw new Error('ONBOARDING_FAILED')
  }
  return res.json() as Promise<OnboardingSubmitResponse>
}

export async function uploadOnboardingPhoto(file: File): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/shop-admin/shop/logo', { method: 'POST', body: form })
  if (!res.ok) throw new Error('PHOTO_UPLOAD_FAILED')
}

export async function startGoogleOAuth(provider: 'google' | 'facebook' | 'apple'): Promise<void> {
  const res = await fetch(`/api/shop-admin/auth/${provider}/authorize`)
  if (!res.ok) throw Object.assign(new Error('OAUTH_UNAVAILABLE'), { code: 'OAUTH_UNAVAILABLE' })
  const data = await res.json() as { auth_url?: string }
  if (data.auth_url) {
    window.location.href = data.auth_url
  }
}
