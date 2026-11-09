'use client'
import Script from 'next/script'
import { useConsent } from './ConsentContext'
import { buildMetaPixelInitScript } from '@/lib/meta-pixel'

interface MetaPixelProps {
  pixelId: string
  nonce?: string
}

export function MetaPixel({ pixelId, nonce }: MetaPixelProps) {
  const { consent } = useConsent()
  if (!consent.marketing) return null

  const initScript = buildMetaPixelInitScript(pixelId)

  return (
    <Script
      id="meta-pixel-init"
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: initScript }}
    />
  )
}
