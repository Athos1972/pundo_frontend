'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminShop, SysAdminShopType, OpeningHoursMap } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from './FormField'
import { OpeningHoursEditor } from './OpeningHoursEditor'
import { LocationEditor } from './LocationEditor'
import { showToast } from './Toast'

interface ShopFormProps {
  shop: SysAdminShop | null  // null = create mode
  shopTypes: SysAdminShopType[]
  tr: SysAdminTranslations
}

export function ShopForm({ shop, shopTypes, tr }: ShopFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = shop != null

  const [name, setName] = useState(shop?.name ?? '')
  const [address, setAddress] = useState(shop?.address_raw ?? '')
  const [phone, setPhone] = useState(shop?.phone ?? '')
  const [website, setWebsite] = useState(shop?.website ?? '')
  const [status, setStatus] = useState(shop?.status ?? 'active')
  const [shopTypeId, setShopTypeId] = useState<string>(String(shop?.shop_type_id ?? ''))
  const [lat, setLat] = useState<number | null>(shop?.location?.lat ?? null)
  const [lng, setLng] = useState<number | null>(shop?.location?.lng ?? null)
  const [openingHours, setOpeningHours] = useState<OpeningHoursMap | null>(shop?.opening_hours ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleLocationChange(newLat: number, newLng: number) {
    setLat(newLat)
    setLng(newLng)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      name: name.trim(),
      address_raw: address.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      status,
      shop_type_id: shopTypeId ? Number(shopTypeId) : null,
      location: lat != null && lng != null ? { lat, lng } : null,
      opening_hours: openingHours,
    }

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/admin/shops/${shop.id}` : '/api/admin/shops'
        const method = isEdit ? 'PATCH' : 'POST'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          showToast(tr.error_generic, 'error')
          return
        }
        showToast(tr.saved, 'success')
        router.push('/admin/shops')
      } catch {
        showToast(tr.error_backend, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <FormField
        label={tr.shop_name}
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        disabled={isPending}
      />

      <FormField
        label={tr.address}
        name="address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={isPending}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={tr.phone}
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isPending}
        />
        <FormField
          label={tr.website}
          name="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          as="select"
          label={tr.status}
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={isPending}
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="pending">pending</option>
        </FormField>

        <FormField
          as="select"
          label={tr.shop_type}
          name="shop_type_id"
          value={shopTypeId}
          onChange={(e) => setShopTypeId(e.target.value)}
          disabled={isPending}
        >
          <option value="">{tr.none}</option>
          {shopTypes.map((st) => (
            <option key={st.id} value={st.id}>{st.name}</option>
          ))}
        </FormField>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">{tr.location}</span>
        <LocationEditor
          lat={lat}
          lng={lng}
          onChange={handleLocationChange}
          searchPlaceholder={tr.search_address}
          noResultsLabel={tr.no_results}
          latLabel={tr.lat}
          lngLabel={tr.lng}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">{tr.opening_hours}</span>
        <OpeningHoursEditor
          value={openingHours}
          onChange={setOpeningHours}
          dayLabels={tr.days}
          closedLabel={tr.closed}
          fromLabel={tr.open_from}
          untilLabel={tr.open_until}
          secondSlotLabel={tr.second_slot}
          addSecondSlotLabel={tr.add_second_slot}
          removeSecondSlotLabel={tr.remove_second_slot}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium
            rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? tr.saving : tr.save}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/shops')}
          disabled={isPending}
          className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700
            rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {tr.cancel}
        </button>
      </div>
    </form>
  )
}
