import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getLangServer } from '@/lib/lang'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import { getClaimShopInfo } from '@/lib/shop-admin-api'
import type { ClaimShopInfo } from '@/types/shop-admin'
import { ClaimPageShell } from '@/components/shop-admin/claim/ClaimPageShell'
import { ClaimWizard } from '@/components/shop-admin/claim/ClaimWizard'

// F5970 — public claim page (no login). Reads the live claim state of the shop on every request.
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ shop?: string; from?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: tShopAdminClaim(await getLangServer()).claim_page_title }
}

export default async function ClaimPage({ searchParams }: Props) {
  const lang = await getLangServer()
  const tr = tShopAdminClaim(lang)
  const { shop, from } = await searchParams

  let info: ClaimShopInfo | null = null
  if (shop) {
    try {
      info = await getClaimShopInfo(shop, lang)
    } catch {
      info = null // unknown / inactive shop or backend problem: same neutral card
    }
  }

  if (!info) {
    return (
      <ClaimPageShell lang={lang} title={tr.claim_shop_not_found_title}>
        <p className="text-sm text-gray-600" data-testid="claim-not-found">{tr.claim_shop_not_found_text}</p>
      </ClaimPageShell>
    )
  }

  return (
    <ClaimPageShell
      lang={lang}
      title={info.mode === 'dispute' ? tr.claim_page_title_dispute : tr.claim_page_title}
      shopSlug={info.shop.slug}
    >
      <Suspense>
        <ClaimWizard lang={lang} info={info} from={from ?? null} />
      </Suspense>
    </ClaimPageShell>
  )
}
