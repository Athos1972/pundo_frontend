'use client'

import { useState } from 'react'
import type { SysAdminShopType } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { SimpleEntityForm } from '@/components/system-admin/SimpleEntityForm'

interface Props {
  shopType: SysAdminShopType
  tr: SysAdminTranslations
}

export function ShopTypeEditForm({ shopType, tr }: Props) {
  const [values, setValues] = useState({
    name: shopType.name,
    description: shopType.description ?? '',
  })

  return (
    <SimpleEntityForm
      fields={[
        { name: 'name', label: tr.name, required: true },
        { name: 'description', label: tr.description, as: 'textarea', rows: 3 },
      ]}
      values={values}
      onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
      submitUrl={`/api/admin/shop-types/${shopType.id}`}
      method="PATCH"
      backHref="/admin/shop-types"
      saveLabel={tr.save}
      savingLabel={tr.saving}
      cancelLabel={tr.cancel}
      savedMessage={tr.saved}
      errorMessage={tr.error_generic}
      backendErrorMessage={tr.error_backend}
    />
  )
}
