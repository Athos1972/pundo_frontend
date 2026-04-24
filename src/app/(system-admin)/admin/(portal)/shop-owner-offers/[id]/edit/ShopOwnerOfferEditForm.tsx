'use client'

import { useState } from 'react'
import type { SysAdminOffer } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { SimpleEntityForm } from '@/components/system-admin/SimpleEntityForm'

interface Props {
  offer: SysAdminOffer
  tr: SysAdminTranslations
}

export function ShopOwnerOfferEditForm({ offer, tr }: Props) {
  const [values, setValues] = useState({
    title: offer.title ?? '',
    description: offer.description ?? '',
    valid_from: offer.valid_from ?? '',
    valid_until: offer.valid_until ?? '',
    offer_url: offer.offer_url ?? '',
  })

  return (
    <SimpleEntityForm
      fields={[
        { name: 'title', label: tr.offer_title },
        { name: 'description', label: tr.offer_desc, as: 'textarea', rows: 3 },
        { name: 'valid_from', label: tr.valid_from, type: 'date' },
        { name: 'valid_until', label: tr.valid_until, type: 'date' },
        { name: 'offer_url', label: 'Offer URL', type: 'url' },
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
