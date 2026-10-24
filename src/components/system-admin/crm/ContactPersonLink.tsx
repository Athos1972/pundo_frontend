'use client'

import Link from 'next/link'
import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Combobox } from '@/components/system-admin/Combobox'
import { crmPost } from './crmFetch'
import { PERSON_SEARCH_MIN, searchCrmPersons, searchErrorText } from './crmSearch'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

export function ContactPersonLink({ contactId, personId, personName, canWrite, tr }: { contactId: number; personId: number | null; personName?: string | null; canWrite: boolean; tr: SysAdminTranslations }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [pending, start] = useTransition()
  const loadPersons = useCallback((query: string) => searchCrmPersons(query), [])
  const errorText = useCallback((error: unknown) => searchErrorText(error, tr), [tr])
  if (personId) return <Link className="text-sm text-slate-700 underline" href={`/admin/crm/persons/${personId}`}>{tr.crm_person_linked}: {personName || `#${personId}`}</Link>
  if (!canWrite) return null
  function submit(event: React.FormEvent) {
    event.preventDefault()
    const target = Number(value)
    if (!Number.isInteger(target) || target < 1) return
    start(async () => { const result = await crmPost(`crm/persons/${target}/contacts/${contactId}`, {}, tr); if (result.ok) router.refresh() })
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <div className="flex w-80 flex-col gap-1 text-xs text-gray-600">
        <span>{tr.crm_person_field}</span>
        <Combobox
          id="crm-person-search"
          items={[]}
          value={value}
          onChange={setValue}
          loadItems={loadPersons}
          placeholder={tr.crm_person_search_placeholder}
          searchLabel={tr.crm_person_field}
          noResultsLabel={tr.no_results}
          minQueryLength={PERSON_SEARCH_MIN}
          minQueryLabel={tr.crm_search_min_chars.replace('{n}', String(PERSON_SEARCH_MIN))}
          loadingLabel={tr.crm_search_loading}
          errorLabel={errorText}
        />
      </div>
      <button type="submit" disabled={pending || !value} className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50">{tr.crm_person_link}</button>
    </form>
  )
}
