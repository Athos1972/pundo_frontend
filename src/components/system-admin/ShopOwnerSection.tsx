'use client'
// F5970 — "Owner" block of the shop editor: the current account (any status), active applications, and the
// "Assign owner…" action. Only imports from src/components/ui/ and system-admin code (Clean Boundary).

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SysAdminShopOwnerOverview } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { AssignOwnerDialog } from './AssignOwnerDialog'

interface Props {
  tr: SysAdminTranslations
  shop: { id: number; name: string }
  overview: SysAdminShopOwnerOverview
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  pre_signup: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-800',
  inactive: 'bg-gray-100 text-gray-600',
}

export function ShopOwnerSection({ tr, shop, overview }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { owner, open_claims: claims } = overview

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5" data-testid="shop-owner-section" aria-labelledby="shop-owner-section-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="shop-owner-section-title" className="text-base font-semibold text-gray-900">{tr.owner_section_title}</h2>
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700" data-testid="open-assign-owner">
          {tr.owner_section_assign}
        </button>
      </div>

      {owner ? (
        <div className="text-sm text-gray-700" data-testid="shop-owner-current">
          <p className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/shop-owners/${owner.id}/edit`} className="font-medium text-slate-800 underline">{owner.email}</Link>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[owner.status] ?? 'bg-gray-100 text-gray-600'}`}>{owner.status}</span>
            {owner.is_system_account && <span className="text-xs text-gray-500">{tr.claims_owner_system}</span>}
          </p>
          <p className="text-gray-500">{owner.name} · {tr.claims_owner_since.replace('{date}', owner.since.slice(0, 10))}</p>
          <p className="text-gray-500">{tr.claims_owner_offers.replace('{offers}', String(owner.offers_active)).replace('{listings}', String(owner.listings))}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">{tr.owner_section_none}</p>
      )}

      {claims.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700">{tr.owner_section_claims}</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {claims.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/claims/${c.id}`} className="text-slate-800 underline">#{c.id}</Link>
                <span className="text-gray-500"> · {c.kind === 'dispute' ? tr.claims_kind_dispute : tr.claims_kind_claim} · {c.applicant?.email ?? '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <AssignOwnerDialog
          tr={tr}
          shops={[shop]}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); router.refresh() }}
        />
      )}
    </section>
  )
}
