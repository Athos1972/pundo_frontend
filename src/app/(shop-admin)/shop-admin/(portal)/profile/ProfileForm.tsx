'use client'

import { useState, useTransition } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from '@/components/shop-admin/FormField'
import { LogoUpload } from '@/components/shop-admin/LogoUpload'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { SocialLinksEditor } from '@/components/shop-admin/SocialLinksEditor'
import { showToast } from '@/components/shop-admin/Toast'
import type { AdminShop, SocialLinksMap, SocialLinkFieldError, SocialLinkBlockedError, SocialLinkBlockCategory } from '@/types/shop-admin'

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
              if (!FIXED_PLATFORM_KEYS.has(blocked.key)) updates['other'] = errorEntry
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
