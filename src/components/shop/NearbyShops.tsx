'use client'
import { useEffect, useState } from 'react'
import { getShops } from '@/lib/api'
import type { ShopListItem } from '@/types/api'
import { t } from '@/lib/translations'
import { ShopCard } from './ShopCard'

type Status = 'loading' | 'ok' | 'empty' | 'error'

export function NearbyShops({ lang }: { lang: string }) {
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Larnaca city centre — used when browser geolocation is denied or
  // unavailable (e.g. HTTP on mobile). Still gives meaningful distances.
  const LARNACA = { lat: 34.9009, lng: 33.6230 }

  useEffect(() => {
    function load(lat: number, lng: number) {
      getShops({ lat, lng, status: 'active' }, lang)
        .then(d => {
          setShops(d.items)
          setStatus(d.items.length > 0 ? 'ok' : 'empty')
        })
        .catch((err: unknown) => {
          setErrorMsg(err instanceof Error ? err.message : String(err))
          setStatus('error')
        })
    }
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => load(pos.coords.latitude, pos.coords.longitude),
        () => load(LARNACA.lat, LARNACA.lng),
        { timeout: 5000 }
      )
    } else {
      load(LARNACA.lat, LARNACA.lng)
    }
  }, [lang]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-surface-alt rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (status === 'error') {
    const tr = t(lang)
    return (
      <p className="text-sm text-text-muted py-4">
        {errorMsg.startsWith('API ') ? tr.shops_load_error : tr.backend_unreachable}{' '}
        <span className="text-text-light text-xs font-mono">{errorMsg}</span>
      </p>
    )
  }

  if (status === 'empty') {
    return (
      <p className="text-sm text-text-muted py-4">
        {t(lang).no_shops_in_db}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {shops.map(shop => <ShopCard key={shop.id} shop={shop} lang={lang} />)}
    </div>
  )
}
