import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getLangServer } from '@/lib/lang'
import { tShopAdminClaim } from '@/lib/i18n/shop-admin-claim'
import { ClaimPageShell } from '@/components/shop-admin/claim/ClaimPageShell'
import { ClaimStatusView } from '@/components/shop-admin/claim/ClaimStatusView'

// F5970 — status of an application, reachable without login through the personal link of the e-mail.
// The access token (`?t=`) is read in the browser only (never rendered server-side) and removed from the URL.
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ id?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: tShopAdminClaim(await getLangServer()).claim_status_title }
}

export default async function ClaimStatusPage({ searchParams }: Props) {
  const lang = await getLangServer()
  const tr = tShopAdminClaim(lang)
  const { id } = await searchParams
  const claimId = id && /^\d+$/.test(id) ? Number(id) : null

  return (
    <ClaimPageShell lang={lang} title={tr.claim_status_title}>
      <Suspense>
        <ClaimStatusView lang={lang} claimId={claimId} />
      </Suspense>
    </ClaimPageShell>
  )
}
