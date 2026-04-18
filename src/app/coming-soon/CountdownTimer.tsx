'use client'
import { useState, useEffect } from 'react'

interface CountdownLabels {
  days: string
  hours: string
  minutes: string
  seconds: string
}

const LAUNCH_MS = Date.UTC(2026, 4, 1, 6, 0, 0) // 2026-05-01T06:00:00Z = 09:00 Nicosia EEST

function getTimeLeft() {
  const diff = Math.max(0, LAUNCH_MS - Date.now())
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor(diff / 3_600_000) % 24,
    m: Math.floor(diff / 60_000) % 60,
    s: Math.floor(diff / 1_000) % 60,
  }
}

export function CountdownTimer({ labels }: { labels: CountdownLabels }) {
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null)

  useEffect(() => {
    setTime(getTimeLeft())
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')
  const t = time ?? { d: 0, h: 0, m: 0, s: 0 }

  const units = [
    { val: t.d, label: labels.days },
    { val: t.h, label: labels.hours },
    { val: t.m, label: labels.minutes },
    { val: t.s, label: labels.seconds },
  ] as const

  return (
    <div className="flex items-end gap-3 sm:gap-6 flex-nowrap justify-center">
      {units.map(({ val, label }, i) => (
        <>
          {i > 0 && (
            <span key={`sep-${i}`} className="cs-num-sep">:</span>
          )}
          <div key={label} className="flex flex-col items-center">
            <span className="cs-num">{pad(val)}</span>
            <span className="cs-num-label">{label}</span>
          </div>
        </>
      ))}
    </div>
  )
}
