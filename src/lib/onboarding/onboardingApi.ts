'use client'

import type { OnboardingSubmitPayload, OnboardingSubmitResponse } from '@/types/shop-admin'
import { OTHER_DOMAIN_SLUG, OTHER_OFFER_MAX_LENGTH } from '@/lib/onboarding/domains'
import { CATALOG_CONSENT_TEXT_VERSION } from '@/lib/onboarding/catalogConsent'

export async function submitOnboarding(payload: OnboardingSubmitPayload): Promise<OnboardingSubmitResponse> {
  // Transform camelCase frontend types to snake_case backend API format.
  // shopName is used directly (no email-local-part fallback — F5910 fix).
  const emailCreds = 'email' in payload.credentials ? payload.credentials : null

  // Strip the frontend-only "Other" sentinel — backend receives [] for "no domain"
  const domainSlugsForBackend = payload.domainSlugs.filter(s => s !== OTHER_DOMAIN_SLUG)
  const specialtySlugsForBackend = domainSlugsForBackend.length > 0 ? payload.specialtySlugs : []

  // F2970: free text of the "Other" chip feeds the service gap report (optional, max 120)
  const otherOfferText = payload.domainSlugs.includes(OTHER_DOMAIN_SLUG)
    ? (payload.otherOfferText ?? '').trim().slice(0, OTHER_OFFER_MAX_LENGTH)
    : ''

  // F5980 AC1: consent is only meaningful with a website (the import source); never sent otherwise.
  const sendConsent = payload.catalogConsent === true && !!payload.contact.website

  const backendPayload = {
    provider_type: payload.providerType,
    domain_slugs: domainSlugsForBackend,
    specialty_slugs: specialtySlugsForBackend,
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
    shop_name: payload.shopName,
    credentials: emailCreds
      ? { type: 'email' as const, email: emailCreds.email, password: emailCreds.password, name: payload.shopName }
      : { type: 'google' as const },
    lang: navigator.language?.slice(0, 2) ?? 'en',
    ...(otherOfferText ? { other_offer_text: otherOfferText } : {}),
    ...(sendConsent
      ? {
          catalog_consent: {
            accepted: true,
            text_version: CATALOG_CONSENT_TEXT_VERSION,
            ...(payload.catalogConsentLang ? { lang: payload.catalogConsentLang } : {}),
          },
        }
      : {}),
    // B6220-003: backend verifies the captcha for the email path only (Google path: none)
    ...(emailCreds && payload.turnstileToken ? { turnstile_token: payload.turnstileToken } : {}),
  }

  const res = await fetch('/api/shop-admin/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendPayload),
  })

  if (res.status === 400) {
    const body = await res.json().catch(() => ({})) as { detail?: unknown }
    if (body.detail === 'captcha_failed') {
      throw Object.assign(new Error('CAPTCHA_FAILED'), { code: 'CAPTCHA_FAILED' })
    }
    const detail = Array.isArray(body.detail) ? body.detail : []
    const shopNameErr = detail.find((d: unknown) => {
      const e = d as { field?: string }
      return e?.field === 'shop_name'
    }) as { field: string; code: string } | undefined
    if (shopNameErr) {
      throw Object.assign(new Error('SHOP_NAME_INVALID'), {
        code: 'SHOP_NAME_INVALID',
        subCode: shopNameErr.code,
      })
    }
    throw new Error('ONBOARDING_FAILED')
  }

  if (res.status === 422) {
    // Backend rejects non-http(s) website URLs (javascript:, data: …) with 422.
    const body = await res.json().catch(() => ({})) as unknown
    const text = JSON.stringify(body)
    // Consent codes first: the 422 body echoes the request (incl. a "website" key), which would
    // otherwise be mistaken for INVALID_URL.
    if (text.includes('catalog_consent_')) {
      throw Object.assign(new Error('CATALOG_CONSENT_INVALID'), { code: 'CATALOG_CONSENT_INVALID' })
    }
    if (text.includes('website')) {
      throw Object.assign(new Error('INVALID_URL'), { code: 'INVALID_URL' })
    }
    throw new Error('ONBOARDING_FAILED')
  }

  if (res.status === 409) {
    const body = await res.json().catch(() => ({})) as { detail?: string }
    throw Object.assign(new Error(body.detail ?? 'EMAIL_TAKEN'), { code: 'EMAIL_TAKEN' })
  }
  if (res.status === 429) {
    throw Object.assign(new Error('RATE_LIMITED'), { code: 'RATE_LIMITED' })
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
