'use client'

import { useTransition } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from '@/components/shop-admin/FormField'
import { showToast } from '@/components/shop-admin/Toast'
import type { AdminShop } from '@/types/shop-admin'

interface ProfileFormProps {
  shop: AdminShop | null
  lang: string
}

export function ProfileForm({ shop, lang }: ProfileFormProps) {
  const tr = tAdmin(lang)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/shop', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.get('name'),
            description: data.get('description'),
            logo_url: data.get('logo_url'),
            address: data.get('address'),
          }),
        })
        if (res.ok) {
          showToast(tr.saved, 'success')
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
      <FormField
        label={tr.logo_url}
        name="logo_url"
        type="url"
        placeholder="https://..."
        defaultValue={shop?.logo_url ?? ''}
      />
      <FormField
        label={tr.address}
        name="address"
        type="text"
        defaultValue={shop?.address ?? ''}
      />
      <button
        type="submit"
        disabled={isPending}
        className="self-start bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold
          hover:bg-accent-dark transition-colors disabled:opacity-50"
      >
        {isPending ? tr.saving : tr.save}
      </button>
    </form>
  )
}
