'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { t } from '@/lib/translations'
import type { FavoriteListItem, AlertInterval, NotificationSettings } from '@/types/api'

interface Props {
  lang: string
}

const INTERVAL_ORDER: AlertInterval[] = ['sofort', 'täglich', 'wöchentlich', 'nie']

export function FavoritesTab({ lang }: Props) {
  const tr = t(lang)
  const [favorites, setFavorites] = useState<FavoriteListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [globalInterval, setGlobalInterval] = useState<AlertInterval>('täglich')
  const [isSavingGlobal, setIsSavingGlobal] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const loadFavorites = useCallback(async (p = 1) => {
    setIsLoading(true)
    const res = await fetch(`/api/customer/customer/favorites?page=${p}&limit=20`)
    if (res.ok) {
      const data = await res.json()
      if (p === 1) {
        setFavorites(data.items)
      } else {
        setFavorites((prev) => [...prev, ...data.items])
      }
      setTotal(data.total)
      setPage(p)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/customer/customer/auth/notification-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: NotificationSettings | null) => {
        if (data) setGlobalInterval(data.default_alert_interval)
      })
    Promise.resolve().then(() => loadFavorites(1))
  }, [loadFavorites])

  async function saveGlobalSettings() {
    setIsSavingGlobal(true)
    const res = await fetch('/api/customer/customer/auth/notification-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_alert_interval: globalInterval }),
    })
    setIsSavingGlobal(false)
    if (res.ok) {
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    }
  }

  async function updateFavoriteInterval(favoriteId: number, newInterval: AlertInterval) {
    const globalIdx = INTERVAL_ORDER.indexOf(globalInterval)
    const newIdx = INTERVAL_ORDER.indexOf(newInterval)
    if (newIdx < globalIdx) {
      alert(tr.favorites_interval_error)
      return
    }
    setFavorites((prev) =>
      prev.map((f) => (f.id === favoriteId ? { ...f, alert_interval: newInterval } : f))
    )
    await fetch(`/api/customer/customer/favorites/${favoriteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval: newInterval }),
    })
  }

  async function deleteFavorite(favoriteId: number) {
    const fav = favorites.find((f) => f.id === favoriteId)
    if (!fav) return
    const res = await fetch(`/api/customer/customer/favorites/${fav.product_id}`, { method: 'DELETE' })
    if (res.ok) {
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))
      setTotal((n) => n - 1)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text">{tr.favorites_tab}</h2>

      {/* Global notification settings */}
      <div className="bg-surface-alt rounded-xl p-4 border border-border">
        <p className="text-sm font-medium text-text mb-1">{tr.favorites_global_label}</p>
        <p className="text-xs text-text-muted mb-3">{tr.favorites_global_hint}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={globalInterval}
            onChange={(e) => setGlobalInterval(e.target.value as AlertInterval)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-surface"
          >
            <option value="sofort">{tr.favorites_interval_sofort}</option>
            <option value="täglich">{tr.favorites_interval_täglich}</option>
            <option value="wöchentlich">{tr.favorites_interval_wöchentlich}</option>
            <option value="nie">{tr.favorites_interval_nie}</option>
          </select>
          <button
            onClick={saveGlobalSettings}
            disabled={isSavingGlobal}
            className="px-4 py-2 bg-accent text-white text-sm rounded-lg disabled:opacity-50"
          >
            {settingsSaved ? tr.favorites_settings_saved : tr.favorites_save_settings}
          </button>
        </div>
      </div>

      {/* Favorites list */}
      {isLoading && favorites.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-text-muted mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <p className="text-text font-medium mb-1">{tr.favorites_empty}</p>
          <p className="text-text-muted text-sm">{tr.favorites_empty_hint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div key={fav.id} className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3">
              <Link href={`/products/${fav.product_slug}`} className="shrink-0">
                <div className="w-14 h-14 bg-surface-alt rounded-lg overflow-hidden">
                  {fav.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fav.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.classList.add('hidden') }}
                    />
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${fav.product_slug}`}
                  className="font-medium text-sm text-text line-clamp-1 hover:text-accent"
                >
                  {fav.product_name}
                </Link>
                {fav.brand && <p className="text-xs text-text-muted">{fav.brand}</p>}
                {fav.best_offer_price && (
                  <p className="text-xs text-accent font-medium mt-0.5">
                    {fav.best_offer_price} {fav.best_offer_currency}
                    {fav.best_offer_shop && ` @ ${fav.best_offer_shop}`}
                  </p>
                )}
              </div>

              <select
                value={fav.alert_interval ?? globalInterval}
                onChange={(e) => updateFavoriteInterval(fav.id, e.target.value as AlertInterval)}
                className="border border-border rounded-lg px-2 py-1.5 text-xs bg-surface shrink-0"
                title={tr.favorites_interval_label}
              >
                <option value="sofort">{tr.favorites_interval_sofort}</option>
                <option value="täglich">{tr.favorites_interval_täglich}</option>
                <option value="wöchentlich">{tr.favorites_interval_wöchentlich}</option>
                <option value="nie">{tr.favorites_interval_nie}</option>
              </select>

              {deleteConfirm === fav.id ? (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => deleteFavorite(fav.id)}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg"
                  >
                    {tr.favorites_delete_yes}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2 py-1 bg-surface-alt text-text-muted text-xs rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(fav.id)}
                  className="shrink-0 p-1.5 text-text-muted hover:text-red-500 transition-colors rounded-lg"
                  title={tr.favorites_delete_confirm}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {favorites.length < total && (
            <button
              onClick={() => loadFavorites(page + 1)}
              disabled={isLoading}
              className="w-full py-2 text-sm text-accent border border-border rounded-xl hover:bg-surface-alt disabled:opacity-50"
            >
              {isLoading ? '…' : tr.load_more}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
