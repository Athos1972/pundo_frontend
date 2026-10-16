'use client'
// System-Admin review moderation (F5930, /admin/reviews). Moved here from the shop portal:
// pundo moderates, shop owners only reply and report. Only imports from src/components/system-admin/ allowed.

import { useState } from 'react'
import type { SysAdminReview } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  reviews: SysAdminReview[]
  tr: SysAdminTranslations
}

const HIDE_REASONS = ['spam', 'offensive', 'legal', 'other'] as const
type HideReason = (typeof HIDE_REASONS)[number]

type ActionKind = 'hide' | 'restore' | 'hide_reply' | 'restore_reply'

function fmt(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), template)
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function ReviewModerationList({ reviews: initial, tr }: Props) {
  const [reviews, setReviews] = useState(initial)
  const [reasonById, setReasonById] = useState<Record<number, HideReason>>({})
  const [dialog, setDialog] = useState<{ id: number; kind: ActionKind } | null>(null)
  const [pending, setPending] = useState(false)
  const [errorById, setErrorById] = useState<Record<number, string | null>>({})

  const messages: Record<ActionKind, string> = {
    hide: tr.rev_confirm_hide,
    restore: tr.rev_confirm_restore,
    hide_reply: tr.rev_confirm_hide_reply,
    restore_reply: tr.rev_confirm_restore_reply,
  }

  async function run(id: number, kind: ActionKind) {
    const reason = reasonById[id] ?? 'spam'
    const path = {
      hide: 'invalidate',
      restore: 'restore',
      hide_reply: 'reply/hide',
      restore_reply: 'reply/restore',
    }[kind]
    const withBody = kind === 'hide' || kind === 'hide_reply'
    setPending(true)
    try {
      // Admin proxy: attaches the admin_token cookie (the shop-owner token is never accepted here).
      const res = await fetch(`/api/admin/reviews/${id}/${path}`, {
        method: 'POST',
        ...(withBody
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }
          : {}),
      })
      if (!res.ok) throw new Error(String(res.status))
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r
          if (kind === 'hide') return { ...r, is_visible: false }
          if (kind === 'restore') return { ...r, is_visible: true }
          if (!r.reply) return r
          return kind === 'hide_reply'
            ? { ...r, reply: { ...r.reply, is_visible: false, hidden_reason: reason } }
            : { ...r, reply: { ...r.reply, is_visible: true, hidden_reason: null } }
        }),
      )
      setErrorById((prev) => ({ ...prev, [id]: null }))
    } catch {
      setErrorById((prev) => ({ ...prev, [id]: tr.rev_action_failed }))
    } finally {
      setPending(false)
      setDialog(null)
    }
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-500">{tr.rev_empty}</p>
  }

  const reasonLabel = (code: string | null): string => {
    if (!code) return '—'
    const key = `rev_reason_${code}` as keyof SysAdminTranslations
    return key in tr ? (tr[key] as string) : code
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => {
        const entity = review.entity
        const entityKind = review.entity_type === 'product' ? tr.rev_entity_product : tr.rev_entity_shop
        const entityHref = entity ? `/en/${entity.type === 'product' ? 'products' : 'shops'}/${entity.slug}` : null
        const reply = review.reply
        return (
          <article
            key={review.id}
            className={`bg-white border rounded-xl p-4 ${!review.is_visible ? 'opacity-70 border-dashed' : 'border-gray-200'}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">{review.user_display_name}</p>
                <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-1">
                  <span>{entityKind}</span>
                  {entity && entityHref ? (
                    <a href={entityHref} className="text-slate-700 underline" target="_blank" rel="noreferrer">
                      {entity.name}
                    </a>
                  ) : (
                    <span>
                      #{review.entity_id} ({tr.rev_entity_gone})
                    </span>
                  )}
                  <span aria-label={fmt(tr.rev_stars, { n: review.stars })}>· {'★'.repeat(review.stars)}</span>
                  <span>· {formatDate(review.created_at)}</span>
                </p>
                {review.comment && (
                  <p dir="auto" className="text-sm text-gray-700 mt-1 whitespace-pre-line">{review.comment}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 text-xs shrink-0">
                {!review.is_visible && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{tr.rev_badge_hidden}</span>
                )}
                {review.reporter_count > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                    {fmt(tr.rev_badge_reports, { n: review.reporter_count })}
                  </span>
                )}
                {review.owner_report_count > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                    {tr.rev_badge_owner_reported}
                  </span>
                )}
              </div>
            </div>

            {review.reports.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-1">{tr.rev_reports_heading}</p>
                <ul className="flex flex-col gap-1">
                  {review.reports.map((rep) => (
                    <li key={rep.id} className="text-xs text-gray-700 bg-gray-50 rounded-lg px-2 py-1">
                      <span className="font-medium">
                        {rep.source === 'shop_owner' ? tr.rev_source_shop_owner : tr.rev_source_customer}
                      </span>
                      {rep.reporter_label ? ` (${rep.reporter_label})` : ''}
                      {': '}
                      {rep.source === 'shop_owner' ? reasonLabel(rep.reason) : (rep.reason ?? '—')}
                      {rep.comment ? (
                        <span dir="auto" className="whitespace-pre-line"> — {rep.comment}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reply && (
              <div className="mt-3 border-s-2 border-gray-200 ps-3">
                <p className="text-xs font-medium text-gray-500">
                  {tr.rev_reply_heading} · {reply.shop_name}
                  {!reply.is_visible && (
                    <span className="ms-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{tr.rev_reply_hidden}</span>
                  )}
                </p>
                <p dir="auto" className="text-sm text-gray-700 whitespace-pre-line">{reply.body}</p>
                {!reply.is_visible && reply.hidden_reason && (
                  <p className="text-xs text-gray-500">{fmt(tr.rev_reply_hidden_reason, { reason: reasonLabel(reply.hidden_reason) })}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {(review.is_visible || (reply && reply.is_visible)) && (
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  {tr.rev_reason_label}
                  <select
                    value={reasonById[review.id] ?? 'spam'}
                    onChange={(e) => setReasonById((prev) => ({ ...prev, [review.id]: e.target.value as HideReason }))}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    {HIDE_REASONS.map((k) => (
                      <option key={k} value={k}>
                        {tr[`rev_reason_${k}` as keyof SysAdminTranslations] as string}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {review.is_visible ? (
                <button type="button" onClick={() => setDialog({ id: review.id, kind: 'hide' })}
                  className="text-xs text-red-600 hover:underline">
                  {tr.rev_action_hide}
                </button>
              ) : (
                <button type="button" onClick={() => setDialog({ id: review.id, kind: 'restore' })}
                  className="text-xs text-green-700 hover:underline">
                  {tr.rev_action_restore}
                </button>
              )}
              {reply && (reply.is_visible ? (
                <button type="button" onClick={() => setDialog({ id: review.id, kind: 'hide_reply' })}
                  className="text-xs text-red-600 hover:underline">
                  {tr.rev_action_hide_reply}
                </button>
              ) : (
                <button type="button" onClick={() => setDialog({ id: review.id, kind: 'restore_reply' })}
                  className="text-xs text-green-700 hover:underline">
                  {tr.rev_action_restore_reply}
                </button>
              ))}
              <a href={`/admin/reviews/${review.id}/audit-log`} className="text-xs text-gray-500 hover:underline ms-auto">
                {tr.rev_audit_link}
              </a>
            </div>

            {errorById[review.id] && (
              <p role="alert" className="text-xs text-red-600 mt-2">{errorById[review.id]}</p>
            )}
          </article>
        )
      })}

      <ConfirmDialog
        open={dialog !== null}
        message={dialog ? messages[dialog.kind] : ''}
        confirmLabel={tr.rev_confirm_yes}
        cancelLabel={tr.cancel}
        isPending={pending}
        onConfirm={() => dialog && run(dialog.id, dialog.kind)}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
