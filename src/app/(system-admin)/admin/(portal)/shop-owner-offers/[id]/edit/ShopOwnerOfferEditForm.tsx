'use client'

import { useState } from 'react'
import type { SysAdminShopOwnerOffer } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { SimpleEntityForm } from '@/components/system-admin/SimpleEntityForm'

interface Props {
  offer: SysAdminShopOwnerOffer
  tr: SysAdminTranslations
}

export function ShopOwnerOfferEditForm({ offer, tr }: Props) {
  const [values, setValues] = useState({
    title: offer.title,
    description: offer.description ?? '',
    price: offer.price ?? '',
    valid_from: offer.valid_from ?? '',
    valid_until: offer.valid_until ?? '',
  })

  return (
    <SimpleEntityForm
      fields={[
        { name: 'title', label: tr.offer_title, required: true },
        { name: 'description', label: tr.offer_desc, as: 'textarea', rows: 3 },
        { name: 'price', label: tr.price },
        { name: 'valid_from', label: tr.valid_from, type: 'date' },
        { name: 'valid_until', label: tr.valid_until, type: 'date' },
      ]}
      values={values}
      onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
      submitUrl={`/api/admin/shop-owner-offers/${offer.id}`}
      method="PATCH"
      backHref="/admin/shop-owner-offers"
      saveLabel={tr.save}
      savingLabel={tr.saving}
      cancelLabel={tr.cancel}
      savedMessage={tr.saved}
      errorMessage={tr.error_generic}
      backendErrorMessage={tr.error_backend}
    />
  )
}
