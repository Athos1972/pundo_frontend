'use client'

import { useState } from 'react'
import type { SysAdminShopOwnerOffer } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { SimpleEntityForm } from '@/components/system-admin/SimpleEntityForm'

// Fields = what PATCH /api/v1/admin/shop-owner-offers/{id} actually persists
// (backend ingestor/api/admin/shop_owner_offers.py::update_shop_owner_offer): title, description,
// price, currency (+ archived). valid_from/valid_until are in the schema but silently dropped;
// offer_url is unknown (ignored). currency is NOT NULL in the DB -> never send null (B8950-014).
interface Props {
  offer: SysAdminShopOwnerOffer
  tr: SysAdminTranslations
}

export function ShopOwnerOfferEditForm({ offer, tr }: Props) {
  const [values, setValues] = useState({
    title: offer.title ?? '',
    description: offer.description ?? '',
    price: offer.price ?? '',
    currency: offer.currency ?? 'EUR',
  })

  return (
    <SimpleEntityForm
      fields={[
        { name: 'title', label: tr.offer_title, required: true },
        { name: 'description', label: tr.offer_desc, as: 'textarea', rows: 3 },
        { name: 'price', label: tr.price, type: 'number', step: '0.01' },
        { name: 'currency', label: tr.currency, required: true, maxLength: 3 },
      ]}
      values={values}
      onChange={(name, value) => setValues((v) => ({ ...v, [name]: name === 'currency' ? value.toUpperCase() : value }))}
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
