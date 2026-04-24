import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getOpeningHours } from '@/lib/shop-admin-api'
import { HoursEditor } from '@/components/shop-admin/HoursEditor'
import type { OpeningHours } from '@/types/shop-admin'

function defaultHours(): OpeningHours[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day: i as OpeningHours['day'],
    open: '09:00',
    close: '18:00',
    closed: false,
  }))
}

export default async function HoursPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let hours = defaultHours()
  try {
    const fetched = await getOpeningHours(lang)
    if (fetched.length === 7) hours = fetched
  } catch (err) {
    console.error('[HoursPage] Failed to fetch opening hours:', err)
    // Falls back to defaults
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{tr.hours_title}</h1>
      <HoursEditor initialHours={hours} lang={lang} />
    </div>
  )
}
