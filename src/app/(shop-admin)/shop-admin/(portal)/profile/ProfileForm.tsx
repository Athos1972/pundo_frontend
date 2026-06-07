'use client'

import { useState, useTransition } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from '@/components/shop-admin/FormField'
import { LogoUpload } from '@/components/shop-admin/LogoUpload'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { SocialLinksEditor } from '@/components/shop-admin/SocialLinksEditor'
import { showToast } from '@/components/shop-admin/Toast'
import { AttributeToggle } from '@/components/shop-admin/AttributeToggle'
import { PaymentMethodsField } from '@/components/shop-admin/PaymentMethodsField'
import type { AdminShop, SocialLinksMap, SocialLinkFieldError, SocialLinkBlockedError, SocialLinkBlockCategory, PaymentMethodValue } from '@/types/shop-admin'

const FIXED_PLATFORM_KEYS = new Set(['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x'])

interface ProfileFormProps {
  shop: AdminShop | null
  lang: string
}

export function ProfileForm({ shop, lang }: ProfileFormProps) {
  const tr = tAdmin(lang)
  const [isPending, startTransition] = useTransition()
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(
    shop?.spoken_languages ?? []
  )
  const [socialLinks, setSocialLinks] = useState<SocialLinksMap | null>(
    shop?.social_links ?? null
  )
  const [socialLinksValid, setSocialLinksValid] = useState(true)
  const [logoUrl, setLogoUrl] = useState<string | null>(shop?.logo_url ?? null)
  const [serverErrors, setServerErrors] = useState<Record<string, SocialLinkFieldError>>({})

  // F5300 / F3800 Phase 1a — Self-service attribute state
  const [radiusInput, setRadiusInput] = useState<string>(
    shop?.service_radius_km != null ? String(shop.service_radius_km) : ''
  )
  const [deliversIslandWide, setDeliversIslandWide] = useState<boolean>(
    shop?.delivers_island_wide ?? false
  )
  const [supportsCharity, setSupportsCharity] = useState<boolean>(
    shop?.supports_charity ?? false
  )
  const [charityNote, setCharityNote] = useState<string>(
    shop?.charity_note ?? ''
  )
  const [appointmentRequired, setAppointmentRequired] = useState<boolean>(
    shop?.appointment_required ?? false
  )
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodValue[]>(
    (shop?.payment_methods ?? []) as PaymentMethodValue[]
  )

  const errorLabels: Partial<Record<SocialLinkBlockCategory, string>> = {
    adult: tr.social_blocked_adult,
    gambling: tr.social_blocked_gambling,
    hate: tr.social_blocked_hate,
    illegal: tr.social_blocked_illegal,
    malware: tr.social_blocked_malware,
    shortener_unresolvable: tr.social_blocked_shortener_unresolvable,
    custom: tr.social_blocked_generic,
  }

  function handleServerErrorDismiss(key: string) {
    setServerErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!socialLinksValid) return
    const data = new FormData(e.currentTarget)

    const phone = (data.get('phone') as string).trim() || null
    const whatsapp = (data.get('whatsapp_number') as string).trim() || null
    const website = (data.get('website_url') as string).trim() || null
    const webshop = (data.get('webshop_url') as string).trim() || null

    startTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/shop', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.get('name'),
            description: data.get('description'),
            logo_url: logoUrl,
            address: data.get('address'),
            spoken_languages: spokenLanguages,
            phone: phone,
            whatsapp_number: whatsapp,
            website_url: website,
            webshop_url: webshop,
            social_links: socialLinks,
            // F5300 / F3800 Phase 1a — self-service attributes
            service_radius_km: deliversIslandWide ? null : (radiusInput ? Number(radiusInput) : null),
            delivers_island_wide: deliversIslandWide,
            supports_charity: supportsCharity,
            charity_note: supportsCharity ? (charityNote.trim() || null) : null,
            // charity_status NOT sent — set server-side on supports_charity change
            appointment_required: appointmentRequired,
            payment_methods: paymentMethods,
          }),
        })
        if (res.ok) {
          setServerErrors({})
          showToast(tr.saved, 'success')
        } else if (res.status === 422) {
          const body = await res.json().catch(() => null)
          if (body?.error === 'social_link_blocked') {
            const blocked = body as SocialLinkBlockedError
            const errorEntry: SocialLinkFieldError = {
              category: blocked.category,
              resolved_host: blocked.resolved_host,
              via_shortener: blocked.via_shortener,
            }
            setServerErrors((prev) => {
              const updates: Record<string, SocialLinkFieldError> = { [blocked.key]: errorEntry }
              // charity_note uses the same block structure — key === 'charity_note'
              if (!FIXED_PLATFORM_KEYS.has(blocked.key) && blocked.key !== 'charity_note') {
                updates['other'] = errorEntry
              }
              return { ...prev, ...updates }
            })
            showToast(tr.social_blocked_toast, 'error')
          } else {
            showToast(tr.error_generic, 'error')
          }
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6">
      <FormField
        label={tr.shop_name}
        name="name"
        type="text"
        required
        defaultValue={shop?.name ?? ''}
      />
      <FormField
        label={tr.description}
        name="description"
        as="textarea"
        rows={3}
        defaultValue={shop?.description ?? ''}
      />
      <LogoUpload
        currentLogoUrl={logoUrl}
        lang={lang}
        onLogoUploaded={(url) => {
          setLogoUrl(url)
          showToast(tr.logo_upload_success, 'success')
        }}
      />
      <FormField
        label={tr.address}
        name="address"
        type="text"
        defaultValue={shop?.address ?? ''}
      />
      <LanguageSelector
        value={spokenLanguages}
        onChange={setSpokenLanguages}
        label={tr.spoken_languages}
      />
      <FormField
        label={tr.phone}
        name="phone"
        type="tel"
        placeholder="+35799123456"
        defaultValue={shop?.phone ?? ''}
      />
      <FormField
        label={tr.whatsapp_number}
        name="whatsapp_number"
        type="tel"
        placeholder="+35799123456"
        defaultValue={shop?.whatsapp_number ?? ''}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={tr.website_url}
          name="website_url"
          type="url"
          placeholder="https://..."
          defaultValue={shop?.website_url ?? ''}
        />
        <FormField
          label={tr.webshop_url}
          name="webshop_url"
          type="url"
          placeholder="https://..."
          defaultValue={shop?.webshop_url ?? ''}
        />
      </div>
      {/* ── F5300 Umkreis-Block ── */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
        <FormField
          label={tr.service_radius_label}
          name="service_radius_km"
          type="number"
          min={0}
          step={1}
          disabled={deliversIslandWide}
          value={radiusInput}
          onChange={e => setRadiusInput(e.target.value)}
          placeholder="e.g. 30"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={deliversIslandWide}
            onChange={e => {
              setDeliversIslandWide(e.target.checked)
              if (e.target.checked) setRadiusInput('')
            }}
            className="rounded border-gray-300 text-accent focus:ring-accent"
          />
          {tr.delivers_island_wide_label}
        </label>
      </div>

      {/* ── F3800 Phase 1a Charity-Block ── */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
        <AttributeToggle
          id="supports_charity"
          label={tr.charity_toggle_label}
          checked={supportsCharity}
          onChange={setSupportsCharity}
        />
        {supportsCharity && (
          <>
            <FormField
              label={tr.charity_note_label}
              name="charity_note"
              as="textarea"
              rows={2}
              maxLength={140}
              value={charityNote}
              onChange={e => setCharityNote((e.target as unknown as HTMLTextAreaElement).value)}
            />
            {/* charity_note block error (same mechanism as social_link_blocked) */}
            {serverErrors['charity_note'] && (
              <p className="text-xs text-red-600" role="alert">
                {errorLabels[serverErrors['charity_note'].category] ?? tr.social_blocked_generic}
              </p>
            )}
            {shop?.charity_status === 'pending' && (
              <p className="text-xs text-amber-600 font-medium">{tr.charity_status_pending}</p>
            )}
            {shop?.charity_status === 'approved' && (
              <p className="text-xs text-green-600 font-medium">{tr.charity_status_approved}</p>
            )}
          </>
        )}
      </div>

      {/* ── Termin-Toggle ── */}
      <AttributeToggle
        id="appointment_required"
        label={tr.appointment_required_label}
        checked={appointmentRequired}
        onChange={setAppointmentRequired}
      />

      {/* ── Zahlungsarten-Multiselect ── */}
      <PaymentMethodsField
        label={tr.payment_methods_label}
        value={paymentMethods}
        onChange={setPaymentMethods}
        getLabel={(key) => tr[key as keyof typeof tr] as string ?? key}
      />

      <SocialLinksEditor
        value={socialLinks}
        onChange={setSocialLinks}
        onValidChange={setSocialLinksValid}
        titleLabel={tr.social_links_title}
        otherLabel={tr.social_platform_other}
        platformNameLabel={tr.social_platform_name}
        urlLabel={tr.social_platform_url}
        serverErrors={serverErrors}
        errorLabels={errorLabels}
        errorViaShortenerTemplate={tr.social_blocked_via_shortener}
        onServerErrorDismiss={handleServerErrorDismiss}
      />
      <button
        type="submit"
        disabled={isPending || !socialLinksValid}
        className="self-start bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold
          hover:bg-accent-dark transition-colors disabled:opacity-50"
      >
        {isPending ? tr.saving : tr.save}
      </button>
    </form>
  )
}
