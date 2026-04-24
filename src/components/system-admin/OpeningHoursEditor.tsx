'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState } from 'react'
import type { DayHours } from '@/types/system-admin'

const DEFAULT_DAY = (day: number): DayHours => ({ day, open: '09:00', close: '18:00', closed: false })

function defaultHours(): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map(DEFAULT_DAY)
}

interface OpeningHoursEditorProps {
  value: DayHours[] | null
  onChange: (hours: DayHours[]) => void
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
  const [hours, setHours] = useState<DayHours[]>(() => value ?? defaultHours())

  function update(dayIndex: number, patch: Partial<DayHours>) {
    const updated = hours.map(h => h.day === dayIndex ? { ...h, ...patch } : h)
    setHours(updated)
    onChange(updated)
  }

  return (
    <div className="flex flex-col gap-3">
      {hours.map((day, idx) => {
        const hasSecond = !!(day.second_open || day.second_close)

        return (
          <div key={day.day} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700 w-24 shrink-0">
                {dayLabels[idx]}
              </span>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.closed}
                  onChange={(e) => update(day.day, { closed: e.target.checked })}
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
                    onChange={(e) => update(day.day, { open: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                  <span className="text-xs text-gray-500">{untilLabel}</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={(e) => update(day.day, { close: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                </div>

                {hasSecond && (
                  <div className="flex flex-wrap items-center gap-2 ms-0">
                    <span className="text-xs text-gray-500">{secondSlotLabel}:</span>
                    <input
                      type="time"
                      value={day.second_open ?? ''}
                      onChange={(e) => update(day.day, { second_open: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                    />
                    <span className="text-xs text-gray-500">{untilLabel}</span>
                    <input
                      type="time"
                      value={day.second_close ?? ''}
                      onChange={(e) => update(day.day, { second_close: e.target.value })}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (hasSecond) {
                      update(day.day, { second_open: undefined, second_close: undefined })
                    } else {
                      update(day.day, { second_open: '13:00', second_close: '18:00' })
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
