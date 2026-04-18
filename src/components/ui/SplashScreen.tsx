'use client'

import { useEffect, useState } from 'react'

const OUTRO_MS = 2500

export function SplashScreen({ splashSvg }: { splashSvg: string }) {
  const [visible, setVisible] = useState<boolean | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem('app_splash')) return
    sessionStorage.setItem('app_splash', '1')

    const show = setTimeout(() => setVisible(true), 0)
    const hide = setTimeout(() => setVisible(false), OUTRO_MS)
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
