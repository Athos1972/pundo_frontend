import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getClaimRequest } from '@/lib/system-admin-api'
import type { SysAdminClaimDetail } from '@/types/system-admin'
import { ClaimDetailPanels, Panel } from '@/components/system-admin/claims/ClaimDetailPanels'
import { ClaimDocumentList } from '@/components/system-admin/claims/ClaimDocumentList'
import { ClaimCallbackPanel } from '@/components/system-admin/claims/ClaimCallbackPanel'
import { ClaimDecisionDialog } from '@/components/system-admin/claims/ClaimDecisionDialog'

// F5970 — claim detail: shop vs. application, proof, documents, call-back, decision, audit trail.
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClaimDetailPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const locale = lang === 'el' ? 'el-GR' : 'en-GB'

  let claim: SysAdminClaimDetail
  try {
    claim = await getClaimRequest(id)
  } catch {
    notFound()
  }

  return (
    <div className="flex flex-col gap-5" data-testid="claim-detail">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/claims" className="text-sm text-gray-500 underline">{tr.claims_back_to_list}</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-gray-900">
            {tr.claims_detail_title.replace('{id}', String(claim.id))}
            {claim.kind === 'dispute' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{tr.claims_badge_dispute}</span>}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700" data-testid="claim-status">{tr[`claims_status_${claim.status}` as 'claims_status_open']}</span>
          </h1>
        </div>
        <ClaimDecisionDialog claim={claim} tr={tr} />
      </div>

      <ClaimDetailPanels claim={claim} tr={tr} locale={locale} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={tr.claims_panel_documents} testId="panel-documents">
          <ClaimDocumentList claimId={claim.id} documents={claim.documents} documentsDeletedAt={claim.documents_deleted_at} tr={tr} />
        </Panel>
        <Panel title={tr.claims_panel_callback} testId="panel-callback">
          <ClaimCallbackPanel claim={claim} tr={tr} locale={locale} />
        </Panel>
      </div>
    </div>
  )
}
