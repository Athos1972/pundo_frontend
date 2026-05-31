'use client'
import Script from 'next/script'
import { useConsent } from './ConsentContext'

interface MetaPixelProps {
  pixelId: string
  nonce?: string
}

export function MetaPixel({ pixelId, nonce }: MetaPixelProps) {
  const { consent } = useConsent()
  if (!consent.marketing) return null

  const initScript = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('consent','grant');fbq('init','${pixelId}');fbq('track','PageView');`

  return (
    <Script
      id="meta-pixel-init"
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: initScript }}
    />
  )
}
