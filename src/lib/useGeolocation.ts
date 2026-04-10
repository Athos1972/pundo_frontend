'use client'
import { useEffect, useState } from 'react'

const LARNACA = { lat: 34.9009, lng: 33.6230 }

export function useGeolocation() {
  const [location, setLocation] = useState(LARNACA)

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
