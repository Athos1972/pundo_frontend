'use client'

import type { OnboardingSubmitPayload, OnboardingSubmitResponse } from '@/types/shop-admin'

export async function submitOnboarding(payload: OnboardingSubmitPayload): Promise<OnboardingSubmitResponse> {
  // Transform camelCase frontend types to snake_case backend API format.
  // Also derive required fields (shop_name, credentials.name, credentials.type)
  // that the backend schema mandates but the wizard doesn't explicitly collect.
  const emailCreds = 'email' in payload.credentials ? payload.credentials : null
  const nameDefault = emailCreds ? emailCreds.email.split('@')[0] : 'owner'

  const backendPayload = {
    provider_type: payload.providerType,
    domain_slugs: payload.domainSlugs,
    specialty_slugs: payload.specialtySlugs,
    location: {
      lat: payload.location.lat,
      lng: payload.location.lng,
      address: payload.location.address,
      is_b2c_storefront: payload.location.isB2cStorefront,
    },
    contact: {
      phone: payload.contact.phone ?? undefined,
      whatsapp: payload.contact.whatsapp ?? undefined,
      business_email: payload.contact.businessEmail ?? undefined,
      instagram: payload.contact.instagram ?? undefined,
      telegram: payload.contact.telegram ?? undefined,
      facebook: payload.contact.facebook ?? undefined,
      website: payload.contact.website ?? undefined,
    },
    shop_name: nameDefault,
    credentials: emailCreds
      ? { type: 'email' as const, email: emailCreds.email, password: emailCreds.password, name: nameDefault }
      : { type: 'google' as const },
    lang: navigator.language?.slice(0, 2) ?? 'en',
  }

  const res = await fetch('/api/shop-admin/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendPayload),
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
  const data = await res.json() as { auth_url?: string; google_auth_url?: string }
  // TODO: remove google_auth_url fallback after backend deploy of oauth-button-onboarding-bug-20260502
  const url = data.auth_url ?? data.google_auth_url
  if (!url) throw Object.assign(new Error('OAUTH_NO_URL'), { code: 'OAUTH_NO_URL' })
  window.location.href = url
}
