'use client'
import { useEffect, useState } from 'react'

import { LARNACA } from './default-location'

export function useGeolocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ ...LARNACA })

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // Larnaca bleibt Fallback
      { timeout: 5000 }
    )
  }, [])

  return location
}
