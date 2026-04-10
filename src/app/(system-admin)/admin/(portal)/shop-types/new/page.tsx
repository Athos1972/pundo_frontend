'use client'

import { useState } from 'react'
import { getLangFromCookie } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { SimpleEntityForm } from '@/components/system-admin/SimpleEntityForm'

export default function NewShopTypePage() {
  const tr = tSysAdmin(getLangFromCookie())
  const [values, setValues] = useState({ name: '', description: '' })

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_shop_types} — {tr.add_new}</h1>
      <SimpleEntityForm
        fields={[
          { name: 'name', label: tr.name, required: true },
          { name: 'description', label: tr.description, as: 'textarea', rows: 3 },
        ]}
        values={values}
        onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
        submitUrl="/api/admin/shop-types"
        method="POST"
        backHref="/admin/shop-types"
        saveLabel={tr.save}
        savingLabel={tr.saving}
        cancelLabel={tr.cancel}
        savedMessage={tr.saved}
        errorMessage={tr.error_generic}
        backendErrorMessage={tr.error_backend}
      />
    </div>
  )
}
