import Script from 'next/script'
import { buildMetaPixelInitScript } from '@/lib/meta-pixel'

interface ShopAdminMetaPixelProps {
  pixelId: string
  nonce?: string
  /** Marketing consent as read from the consent cookie on the server. */
  marketingConsent: boolean
}

/**
 * Meta Pixel for the shop-admin route group (needed for the CompleteRegistration
 * event of the shop registration). Deliberately self-contained: it does NOT import
 * ConsentContext/MetaPixel from customer-facing code (Clean Boundary). Consent is
 * decided server-side from the shared cookie (set by the customer banner); without
 * marketing opt-in nothing is rendered, so the pixel never loads.
 */
export function ShopAdminMetaPixel({ pixelId, nonce, marketingConsent }: ShopAdminMetaPixelProps) {
  if (!marketingConsent) return null
  return (
    <Script
      id="meta-pixel-init"
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: buildMetaPixelInitScript(pixelId) }}
    />
  )
}
