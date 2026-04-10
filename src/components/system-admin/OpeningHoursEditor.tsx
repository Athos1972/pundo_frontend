'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState } from 'react'
import type { OpeningHoursMap, DayHours } from '@/types/system-admin'

const DAY_KEYS = ['0', '1', '2', '3', '4', '5', '6']

const DEFAULT_DAY: DayHours = { open: '09:00', close: '18:00', closed: false }

function defaultHours(): OpeningHoursMap {
  return Object.fromEntries(DAY_KEYS.map((k) => [k, { ...DEFAULT_DAY }]))
}

interface OpeningHoursEditorProps {
  value: OpeningHoursMap | null
  onChange: (hours: OpeningHoursMap) => void
  dayLabels: string[]  // 7 labels: Mon–Sun
  closedLabel: string
  fromLabel: string
  untilLabel: string
  secondSlotLabel: string
  addSecondSlotLabel: string
  removeSecondSlotLabel: string
}

export function OpeningHoursEditor({
  value,
  onChange,
  dayLabels,
  closedLabel,
  fromLabel,
  untilLabel,
  secondSlotLabel,
  addSecondSlotLabel,
  removeSecondSlotLabel,
}: OpeningHoursEditorProps) {
  const [hours, setHours] = useState<OpeningHoursMap>(() => value ?? defaultHours())

  function update(dayKey: string, patch: Partial<DayHours>) {
    const updated = { ...hours, [dayKey]: { ...hours[dayKey], ...patch } }
    setHours(updated)
    onChange(updated)
  }

  return (
    <div className="flex flex-col gap-3">
      {DAY_KEYS.map((key, idx) => {
        const day = hours[key] ?? { ...DEFAULT_DAY }
        const hasSecond = !!(day.second_open || day.second_close)

        return (
          <div key={key} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700 w-24 shrink-0">
                {dayLabels[idx]}
              </span>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.closed}
                  onChange={(e) => update(key, { closed: e.target.checked })}
                  className="rounded border-gray-300 text-slate-700 focus:ring-slate-600"
                />
                {closedLabel}
              </label>
            </div>

            {!day.closed && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">{fromLabel}</span>
                  <input
                    type="time"
                    value={day.open}
                    onChange={(e) => update(key, { open: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                  <span className="text-xs text-gray-500">{untilLabel}</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={(e) => update(key, { close: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                </div>

                {hasSecond && (
                  <div className="flex flex-wrap items-center gap-2 ms-0">
                    <span className="text-xs text-gray-500">{secondSlotLabel}:</span>
                    <input
                      type="time"
                      value={day.second_open ?? ''}
                      onChange={(e) => update(key, { second_open: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                    />
                    <span className="text-xs text-gray-500">{untilLabel}</span>
                    <input
                      type="time"
                      value={day.second_close ?? ''}
                      onChange={(e) => update(key, { second_close: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (hasSecond) {
                      update(key, { second_open: undefined, second_close: undefined })
                    } else {
                      update(key, { second_open: '13:00', second_close: '18:00' })
                    }
                  }}
                  className="self-start text-xs text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                >
                  {hasSecond ? removeSecondSlotLabel : addSecondSlotLabel}
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
