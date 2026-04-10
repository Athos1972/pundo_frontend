'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { showToast } from './Toast'
import type { OpeningHours } from '@/types/shop-admin'

interface HoursEditorProps {
  initialHours: OpeningHours[]
  lang: string
}

export function HoursEditor({ initialHours, lang }: HoursEditorProps) {
  const tr = tAdmin(lang)
  const [hours, setHours] = useState<OpeningHours[]>(initialHours)
  const [isPending, startTransition] = useTransition()

  function updateDay(day: number, patch: Partial<OpeningHours>) {
    setHours((prev) => prev.map((h) => h.day === day ? { ...h, ...patch } : h))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/shop/hours', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hours),
        })
        if (res.ok) {
          showToast(tr.saved, 'success')
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {hours.map((slot, idx) => (
          <div key={slot.day} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
            {/* Day label */}
            <span className="w-28 shrink-0 text-sm font-medium text-gray-700">
              {tr.days[idx]}
            </span>

            {/* Closed toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={slot.closed}
                onChange={(e) => updateDay(slot.day, { closed: e.target.checked })}
                className="w-4 h-4 rounded accent-accent"
                aria-label={`${tr.days[idx]} ${tr.closed}`}
              />
              <span className="text-sm text-gray-600">{tr.closed}</span>
            </label>

            {/* Time inputs */}
            {!slot.closed && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-400">{tr.open_from}</span>
                <input
                  type="time"
                  value={slot.open}
                  onChange={(e) => updateDay(slot.day, { open: e.target.value })}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                  aria-label={`${tr.days[idx]} open from`}
                />
                <span className="text-gray-400">{tr.open_until}</span>
                <input
                  type="time"
                  value={slot.close}
                  onChange={(e) => updateDay(slot.day, { close: e.target.value })}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                  aria-label={`${tr.days[idx]} close at`}
                />

                {/* Second slot */}
                {slot.second_open !== undefined ? (
                  <>
                    <span className="text-gray-300 mx-1">|</span>
                    <input
                      type="time"
                      value={slot.second_open ?? ''}
                      onChange={(e) => updateDay(slot.day, { second_open: e.target.value })}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                      aria-label={`${tr.days[idx]} second open from`}
                    />
                    <span className="text-gray-400">{tr.open_until}</span>
                    <input
                      type="time"
                      value={slot.second_close ?? ''}
                      onChange={(e) => updateDay(slot.day, { second_close: e.target.value })}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                      aria-label={`${tr.days[idx]} second close at`}
                    />
                    <button
                      type="button"
                      onClick={() => updateDay(slot.day, { second_open: undefined, second_close: undefined })}
                      className="text-xs text-gray-400 hover:text-red-500"
                      aria-label="Remove second slot"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateDay(slot.day, { second_open: '13:00', second_close: '17:00' })}
                    className="text-xs text-accent hover:underline"
                  >
                    + {tr.second_slot}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="self-start bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold
          hover:bg-accent-dark transition-colors disabled:opacity-50"
      >
        {isPending ? tr.saving : tr.hours_save}
      </button>
    </div>
  )
}
