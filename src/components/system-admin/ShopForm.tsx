'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminShop, SysAdminShopType, OpeningHoursMap } from '@/types/system-admin'
import { pickName } from '@/types/system-admin'
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

  // For EN name editing — stored internally as a plain string, sent as {en: ...}
  const [name, setName] = useState(pickName(shop?.names, ''))
  const [address, setAddress] = useState(shop?.address_line1 ?? '')
  const [city, setCity] = useState(shop?.city ?? '')
  const [phone, setPhone] = useState(shop?.phone ?? '')
  const [whatsapp_number, setWhatsapp] = useState(shop?.whatsapp_number ?? '')
  const [website, setWebsite] = useState(shop?.website_url ?? '')
  const [status, setStatus] = useState(shop?.status ?? 'active')
  const [shopTypeId, setShopTypeId] = useState<string>(String(shop?.shop_type_id ?? ''))
  const [lat, setLat] = useState<number | null>(shop?.lat ?? null)
  const [lng, setLng] = useState<number | null>(shop?.lng ?? null)
  const [openingHours, setOpeningHours] = useState<OpeningHoursMap | null>(shop?.opening_hours ?? null)
  const [email, setEmail] = useState(shop?.email ?? '')
  const [webshopUrl, setWebshopUrl] = useState(shop?.webshop_url ?? '')
  const [postalCode, setPostalCode] = useState(shop?.postal_code ?? '')
  const [isOnlineOnly, setIsOnlineOnly] = useState(shop?.is_online_only ?? false)
  const [hasParking, setHasParking] = useState(shop?.has_parking ?? false)
  const [hasOwnDelivery, setHasOwnDelivery] = useState(shop?.has_own_delivery ?? false)
  const [sellsLiveAnimals, setSellsLiveAnimals] = useState(shop?.sells_live_animals ?? false)
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
      names: { en: name.trim() },
      address_line1: address.trim() || null,
      city: city.trim() || null,
      phone: phone.trim() || null,
      whatsapp_number: whatsapp_number.trim() || null,
      website_url: website.trim() || null,
      status,
      shop_type_id: shopTypeId ? Number(shopTypeId) : null,
      lat: lat ?? null,
      lng: lng ?? null,
      opening_hours: openingHours,
      email: email.trim() || null,
      webshop_url: webshopUrl.trim() || null,
      postal_code: postalCode.trim() || null,
      is_online_only: isOnlineOnly,
      has_parking: hasParking,
      has_own_delivery: hasOwnDelivery,
      sells_live_animals: sellsLiveAnimals,
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

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={tr.address}
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isPending}
        />
        <FormField
          label="City"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isPending}
        />
      </div>

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
          label="WhatsApp"
          name="whatsapp_number"
          type="tel"
          placeholder="+35799123456"
          value={whatsapp_number}
          onChange={(e) => setWhatsapp(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={tr.website}
          name="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={isPending}
        />
        <FormField
          label={tr.shop_email}
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={tr.webshop_url}
          name="webshop_url"
          type="url"
          value={webshopUrl}
          onChange={(e) => setWebshopUrl(e.target.value)}
          disabled={isPending}
        />
        <FormField
          label={tr.postal_code}
          name="postal_code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
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
            <option key={st.id} value={st.id}>{st.name ?? st.canonical}</option>
          ))}
        </FormField>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Options</span>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: tr.is_online_only, checked: isOnlineOnly, onChange: setIsOnlineOnly },
            { label: tr.has_parking, checked: hasParking, onChange: setHasParking },
            { label: tr.has_own_delivery, checked: hasOwnDelivery, onChange: setHasOwnDelivery },
            { label: tr.sells_live_animals, checked: sellsLiveAnimals, onChange: setSellsLiveAnimals },
          ].map(({ label, checked, onChange }) => (
            <label key={label} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={isPending}
                className="rounded border-gray-300 text-slate-700 focus:ring-slate-600"
              />
              {label}
            </label>
          ))}
        </div>
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
