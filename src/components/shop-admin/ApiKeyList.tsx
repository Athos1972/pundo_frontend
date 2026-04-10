'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { showToast } from './Toast'
import type { ApiKey, ApiKeyCreated } from '@/types/shop-admin'

interface ApiKeyListProps {
  initialKeys: ApiKey[]
  lang: string
}

export function ApiKeyList({ initialKeys, lang }: ApiKeyListProps) {
  const tr = tAdmin(lang)
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop-admin/api-keys/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setKeys((prev) => prev.filter((k) => k.id !== id))
          showToast('Deleted', 'success')
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
      setConfirmId(null)
    })
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = (data.get('name') as string).trim()
    const scope = data.get('scope') as ApiKey['scope']
    if (!name) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, scope }),
        })
        if (res.ok) {
          const created: ApiKeyCreated = await res.json()
          setNewKey(created)
          setKeys((prev) => [...prev, { id: created.id, name: created.name, scope: created.scope, created_at: created.created_at }])
          setShowCreate(false)
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => showToast(tr.key_copied, 'success'))
  }

  const scopeLabel = (scope: ApiKey['scope']) =>
    scope === 'read' ? tr.scope_read : scope === 'write' ? tr.scope_write : tr.scope_read_write

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {/* Newly created key — shown once */}
      {newKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-amber-800">{tr.key_once_warning}</p>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-amber-300 px-3 py-2">
            <code className="flex-1 text-xs break-all font-mono text-gray-800">{newKey.key}</code>
            <button
              onClick={() => copyKey(newKey.key)}
              className="shrink-0 text-xs bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
            >
              {tr.key_copy}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="self-start text-xs text-amber-600 hover:underline"
          >
            {tr.cancel} (dismiss)
          </button>
        </div>
      )}

      {/* Key list */}
      {keys.length === 0 && !showCreate ? (
        <p className="text-gray-400 text-sm py-8 text-center">{tr.no_results}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{k.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {scopeLabel(k.scope)}
                  {' · '}
                  {tr.key_created}: {new Date(k.created_at).toLocaleDateString()}
                  {' · '}
                  {tr.key_last_used}: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : tr.key_never}
                </p>
              </div>
              {confirmId === k.id ? (
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDelete(k.id)}
                    disabled={isPending}
                    className="text-xs text-white bg-red-500 px-2 py-0.5 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {tr.delete}
                  </button>
                  <button onClick={() => setConfirmId(null)} className="text-xs text-gray-400">
                    {tr.cancel}
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmId(k.id)}
                  className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                >
                  {tr.delete}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate ? (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <input
            name="name"
            type="text"
            required
            placeholder={tr.key_name}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
            aria-label={tr.key_name}
          />
          <select
            name="scope"
            defaultValue="read_write"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
            aria-label={tr.key_scope}
          >
            <option value="read">{tr.scope_read}</option>
            <option value="write">{tr.scope_write}</option>
            <option value="read_write">{tr.scope_read_write}</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold
                hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {isPending ? '…' : tr.add_key}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              {tr.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="self-start bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold
            hover:bg-accent-dark transition-colors"
        >
          + {tr.add_key}
        </button>
      )}
    </div>
  )
}
