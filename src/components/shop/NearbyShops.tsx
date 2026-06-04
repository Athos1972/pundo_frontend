'use client'
import { useEffect, useState } from 'react'
import { getShops } from '@/lib/api'
import type { ShopListItem } from '@/types/api'
import { ShopCard } from './ShopCard'

type Status = 'loading' | 'ok' | 'empty' | 'error'

interface Props {
  lang: string
  /** Optional section heading — rendered only when shops load successfully */
  heading?: string
}

export function NearbyShops({ lang, heading }: Props) {
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [status, setStatus] = useState<Status>('loading')

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
        .catch(() => {
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

  // Graceful fallback — hide entire section on error or empty result
  if (status === 'error') return null
  if (status === 'empty') return null

  return (
    <div>
      {heading && (
        <h2 className="font-display text-xl font-bold text-text mb-5">{heading}</h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {shops.map(shop => <ShopCard key={shop.id} shop={shop} lang={lang} />)}
      </div>
    </div>
  )
}
