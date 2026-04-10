'use client'
// Generic form for simple entities (ShopType, Offer, etc.)
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from './FormField'
import { showToast } from './Toast'

export interface SimpleField {
  name: string
  label: string
  type?: string
  as?: 'input' | 'textarea' | 'select'
  required?: boolean
  options?: { value: string; label: string }[]
  rows?: number
}

interface SimpleEntityFormProps {
  fields: SimpleField[]
  values: Record<string, string>
  onChange: (name: string, value: string) => void
  submitUrl: string
  method: 'POST' | 'PATCH'
  backHref: string
  saveLabel: string
  savingLabel: string
  cancelLabel: string
  savedMessage: string
  errorMessage: string
  backendErrorMessage: string
}

export function SimpleEntityForm({
  fields,
  values,
  onChange,
  submitUrl,
  method,
  backHref,
  saveLabel,
  savingLabel,
  cancelLabel,
  savedMessage,
  errorMessage,
  backendErrorMessage,
}: SimpleEntityFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload: Record<string, string | null> = {}
    for (const field of fields) {
      payload[field.name] = values[field.name]?.trim() || null
    }

    startTransition(async () => {
      try {
        const res = await fetch(submitUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          showToast(errorMessage, 'error')
          return
        }
        showToast(savedMessage, 'success')
        router.push(backHref)
      } catch {
        showToast(backendErrorMessage, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      {fields.map((field) => (
        <FormField
          key={field.name}
          as={field.as ?? 'input'}
          label={field.label}
          name={field.name}
          type={field.type}
          required={field.required}
          rows={field.rows}
          value={values[field.name] ?? ''}
          onChange={(e) => onChange(field.name, e.target.value)}
          disabled={isPending}
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </FormField>
      ))}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium
            rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? savingLabel : saveLabel}
        </button>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          disabled={isPending}
          className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700
            rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {cancelLabel}
        </button>
      </div>
    </form>
  )
}
