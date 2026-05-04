'use client'

import { useEffect, useState } from 'react'
import { SPLASH_OUTRO_MS, SPLASH_SESSION_KEY } from '@/lib/splash'

export function SplashScreen({ splashSvg }: { splashSvg: string }) {
  const [visible, setVisible] = useState<boolean | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY)) return
    sessionStorage.setItem(SPLASH_SESSION_KEY, '1')

    const show = setTimeout(() => setVisible(true), 0)
    const hide = setTimeout(() => setVisible(false), SPLASH_OUTRO_MS)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex items-center justify-center"
      aria-hidden="true"
    >
      <img src={splashSvg} alt="" className="w-full h-full object-contain" />
    </div>
  )
}
