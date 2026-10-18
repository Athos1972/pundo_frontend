// F5970 — read-only panels of the claim detail: listing vs. application, proof, current owner, other applications,
// decision and the audit trail. Server Component (no state). Only imports from src/components/ui/ and system-admin code.

import Link from 'next/link'
import type { SysAdminClaimDetail } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { methodLabel, subStateLabel } from './ClaimQueueTable'

interface Props {
  claim: SysAdminClaimDetail
  tr: SysAdminTranslations
  locale: string
}

const CONTACT_LABELS: Record<string, keyof SysAdminTranslations> = {
  email: 'claims_field_email',
  phone: 'claims_field_phone',
  website_url: 'claims_field_website',
  webshop_url: 'claims_field_webshop',
}

export function Panel({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4" data-testid={testId}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`min-w-0 break-words text-gray-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  )
}

export function ClaimDetailPanels({ claim, tr, locale }: Props) {
  const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(locale) : '—')
  const snapshot = claim.shop_contact_snapshot
  const changed = new Set(claim.contact_changed_since_request)
  const shop = claim.shop
  const owner = claim.current_owner

  const contactValue = (field: 'email' | 'phone' | 'website_url' | 'webshop_url') => (
    <>
      {shop[field] ?? '—'}
      {changed.has(field) && snapshot && (
        <span className="ms-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800" data-testid={`changed-${field}`}>
          {tr.claims_snapshot_value.replace('{value}', snapshot[field] ?? '—')}
        </span>
      )}
    </>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={tr.claims_panel_shop} testId="panel-shop">
        <dl className="flex flex-col gap-1">
          <Row label={tr.claims_field_name} value={<Link href={`/admin/shops/${shop.id}/edit`} className="underline">{shop.name}</Link>} />
          <Row label={tr.claims_field_address} value={[shop.address, shop.city].filter(Boolean).join(', ')} />
          <Row label={tr.claims_field_email} value={contactValue('email')} />
          <Row label={tr.claims_field_phone} value={contactValue('phone')} />
          <Row label={tr.claims_field_website} value={contactValue('website_url')} />
          <Row label={tr.claims_field_webshop} value={contactValue('webshop_url')} />
          <Row label={tr.claims_field_source} value={[shop.source, shop.source_url].filter(Boolean).join(' · ')} />
          <Row label={tr.claims_field_status} value={shop.status} />
        </dl>
        {claim.contact_changed_since_request.length > 0 && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="contact-changed">
            {tr.claims_changed_since.replace('{fields}', claim.contact_changed_since_request.map((f) => String(tr[CONTACT_LABELS[f] ?? 'claims_field_name'])).join(', '))}
          </p>
        )}
      </Panel>

      <Panel title={tr.claims_panel_applicant} testId="panel-applicant">
        <dl className="flex flex-col gap-1">
          <Row label={tr.claims_field_name} value={claim.applicant?.name} />
          <Row label={tr.claims_field_email} value={claim.applicant?.email} />
          <Row label={tr.claims_field_email_verified} value={claim.applicant?.email_verified ? tr.claims_yes : tr.claims_no} />
          <Row label={tr.claims_field_lang} value={claim.applicant_lang} />
          <Row label={tr.claims_col_created} value={fmt(claim.created_at)} />
          <Row label={tr.claims_field_message} value={claim.applicant_message ? <span className="whitespace-pre-line">{claim.applicant_message}</span> : null} />
        </dl>
      </Panel>

      <Panel title={tr.claims_panel_proof} testId="panel-proof">
        <dl className="flex flex-col gap-1">
          <Row label={tr.claims_col_method} value={methodLabel(claim.proof_method, tr)} />
          <Row label={tr.claims_col_state} value={subStateLabel(claim, tr)} />
          {claim.proof_method === 'email_domain' && (
            <Row label={tr.claims_proof_domain_match} value={claim.email_domain_match ? tr.claims_yes : tr.claims_no} />
          )}
          <Row
            label={tr.claims_panel_proof}
            value={claim.proof_verified_at
              ? tr.claims_proof_verified.replace('{date}', fmt(claim.proof_verified_at)).replace('{by}', (claim.events.find((e) => e.to_status === 'verified')?.actor_type === 'admin') ? tr.claims_proof_by_admin : tr.claims_proof_by_system)
              : tr.claims_proof_none}
          />
          {claim.code && (
            <Row label={tr.claims_field_code} value={tr.claims_code_state.replace('{time}', fmt(claim.code.expires_at)).replace('{n}', String(claim.code.failed_attempts))} />
          )}
        </dl>
      </Panel>

      <Panel title={tr.claims_panel_owner} testId="panel-owner">
        {owner ? (
          <dl className="flex flex-col gap-1">
            <Row label={tr.claims_field_email} value={<Link href={`/admin/shop-owners/${owner.id}/edit`} className="underline">{owner.email}</Link>} />
            <Row label={tr.claims_field_name} value={owner.name} />
            <Row label={tr.claims_field_status} value={`${owner.status}${owner.is_system_account ? ` · ${tr.claims_owner_system}` : ''}`} />
            <Row label={tr.claims_owner_since.replace(' {date}', '')} value={fmt(owner.since)} />
            <Row label={tr.claims_col_shop} value={tr.claims_owner_offers.replace('{offers}', String(owner.offers_active)).replace('{listings}', String(owner.listings))} />
          </dl>
        ) : (
          <p className="text-sm text-gray-400">{tr.claims_owner_none}</p>
        )}
      </Panel>

      {claim.other_open_requests.length > 0 && (
        <Panel title={tr.claims_panel_others} testId="panel-others">
          <ul className="flex flex-col gap-1 text-sm">
            {claim.other_open_requests.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/claims/${o.id}`} className="underline">#{o.id}</Link>
                <span className="text-gray-500"> · {o.applicant_email ?? '—'} · {o.status}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {claim.decision && (
        <Panel title={tr.claims_panel_decision} testId="panel-decision">
          <p className="text-sm text-gray-700">{tr.claims_decision_by.replace('{id}', String(claim.decision.by_admin_id ?? '—')).replace('{date}', fmt(claim.decision.at))}</p>
          {claim.decision.reason && <p className="whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">{claim.decision.reason}</p>}
          <ul className="text-sm text-gray-600">
            {claim.decision.previous_owner_id !== null && <li>{tr.claims_decision_prev_owner.replace('{id}', String(claim.decision.previous_owner_id))}</li>}
            {claim.decision.offers_flagged_count !== null && claim.decision.offers_flagged_count > 0 && <li>{tr.claims_decision_flagged.replace('{n}', String(claim.decision.offers_flagged_count))}</li>}
            {claim.decision.withdrawn_consent_id !== null && <li>{tr.claims_decision_consent.replace('{id}', String(claim.decision.withdrawn_consent_id))}</li>}
            {claim.decision.cancelled_case_ids && claim.decision.cancelled_case_ids.length > 0 && <li>{tr.claims_decision_cases.replace('{ids}', claim.decision.cancelled_case_ids.map((i) => `#${i}`).join(', '))}</li>}
          </ul>
        </Panel>
      )}

      <div className="lg:col-span-2">
        <Panel title={tr.claims_panel_timeline} testId="panel-timeline">
          <ol className="flex flex-col gap-1 text-xs" data-testid="claim-timeline">
            {claim.events.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 text-gray-700">
                <span className="text-gray-400">{fmt(e.at)}</span>
                <span className="font-mono">{e.type}</span>
                {(e.from_status || e.to_status) && <span>{e.from_status ?? '∅'} → {e.to_status ?? '∅'}</span>}
                <span className="text-gray-500">{e.actor_type}{e.actor_id ? ` #${e.actor_id}` : ''}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  )
}
