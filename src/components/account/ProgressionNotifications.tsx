'use client'

import { useEffect, useRef, useState } from 'react'
import type { Lang } from '@/lib/lang'
import type { Translations } from '@/lib/translations'

type Category = 'achievement' | 'weekly_summary'
type Notice = { id: string; kind: string; read_at: string | null }
type Preference = { category: Category; channel: 'email'; language: Lang; consented: boolean }

interface Props {
  brand: 'pundo' | 'naidivse'
  lang: Lang
  tr: Translations
}

function noticeLabel(kind: string, tr: Translations): string {
  return ({ level_up: tr.progression_notification_level, badge_awarded: tr.progression_notification_badge,
    feedback_ready: tr.progression_notification_feedback, weekly_summary: tr.progression_notification_weekly }[kind]
    ?? tr.progression_notifications)
}

export function ProgressionNotifications({ brand, lang, tr }: Props) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const query = `?brand=${encodeURIComponent(brand)}`
    void Promise.all([
      fetch(`/api/customer/customer/progression/notifications${query}`).then((response) => response.ok ? response.json() : []),
      fetch(`/api/customer/customer/progression/notification-preferences${query}`).then((response) => response.ok ? response.json() : []),
    ]).then(([notificationRows, preferenceRows]) => {
      setNotices(notificationRows)
      setPreferences(preferenceRows)
    }).catch(() => undefined)
  }, [brand])

  useEffect(() => {
    if (open) titleRef.current?.focus()
  }, [open])

  async function markRead(id: string) {
    const response = await fetch(`/api/customer/customer/progression/notifications/${id}/read`, { method: 'POST' })
    if (response.ok) setNotices((rows) => rows.map((notice) => notice.id === id ? { ...notice, read_at: new Date().toISOString() } : notice))
  }

  async function updatePreference(category: Category, consented: boolean, language: Lang = preferences.find((row) => row.category === category)?.language ?? lang) {
    const response = await fetch(`/api/customer/customer/progression/notification-preferences?brand=${encodeURIComponent(brand)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, channel: 'email', language, consented }),
    })
    if (!response.ok) {
      setStatus(tr.progression_preference_failed)
      return
    }
    const saved = await response.json() as Preference
    setPreferences((rows) => [...rows.filter((row) => row.category !== category), saved])
    setStatus(tr.progression_preference_saved)
  }

  const consented = (category: Category) => preferences.find((row) => row.category === category)?.consented === true

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rtl:flex-row-reverse">
        <h3 className="text-sm font-semibold text-text">{tr.progression_notifications}</h3>
        <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-alt" onClick={() => setOpen(true)}>
          {tr.progression_notifications}
        </button>
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="progression-notifications-title" tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }} className="rounded-xl border border-border bg-surface p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3 rtl:flex-row-reverse">
            <h4 ref={titleRef} id="progression-notifications-title" tabIndex={-1} className="font-semibold text-text outline-none">{tr.progression_notifications}</h4>
            <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-alt" onClick={() => setOpen(false)} aria-label={tr.progression_close}>{tr.progression_close}</button>
          </div>
          {notices.length === 0 ? <p className="text-sm text-text-muted rtl:text-right">{tr.progression_notifications_empty}</p> : (
            <ul className="space-y-2">
              {notices.map((notice) => <li key={notice.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm rtl:flex-row-reverse">
                <span className="text-text">{noticeLabel(notice.kind, tr)}</span>
                {!notice.read_at && <button type="button" className="text-accent underline" onClick={() => void markRead(notice.id)}>{tr.progression_mark_read}</button>}
              </li>)}
            </ul>
          )}
        </div>
      )}
      <fieldset className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-text">{tr.progression_preferences}</legend>
        {(['achievement', 'weekly_summary'] as const).map((category) => {
          const language = preferences.find((row) => row.category === category)?.language ?? lang
          return <div key={category} className="flex items-center justify-between gap-3 text-sm text-text rtl:flex-row-reverse">
            <label className="flex cursor-pointer items-center gap-2 rtl:flex-row-reverse">
              <span>{category === 'achievement' ? tr.progression_preference_achievement : tr.progression_preference_weekly}</span>
              <input type="checkbox" checked={consented(category)} onChange={(event) => void updatePreference(category, event.target.checked, language)} />
            </label>
            <select aria-label={tr.progression_preferences} className="rounded border border-border bg-surface px-2 py-1 text-text" value={language} onChange={(event) => void updatePreference(category, consented(category), event.target.value as Lang)}>
              {(['en', 'de', 'el', 'ru', 'ar', 'he'] as Lang[]).map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}
            </select>
          </div>
        })}
        <p aria-live="polite" className="text-xs text-text-muted">{status}</p>
      </fieldset>
    </div>
  )
}
