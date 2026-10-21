'use client'

import { t } from '@/lib/translations'
import type { ProgressionPreflightResponse } from '@/types/api'

interface Props {
  lang: string
  preview: ProgressionPreflightResponse
  onConfirm: () => void
  onCancel: () => void
  isSubmitting?: boolean
}

/** Small K3-only price preview; it deliberately does not show K4 wallet history. */
export function WalletChargeConfirmDialog({ lang, preview, onConfirm, onCancel, isSubmitting = false }: Props) {
  const tr = t(lang)
  const remaining = Math.max(0, preview.allowance.free_limit - preview.allowance.used)
  const isPaid = preview.charge.kind === 'credits'

  return (
    <section aria-live="polite" aria-label={tr.progression_preview_title} className="flex flex-col gap-4 py-2">
      <h3 className="text-base font-bold text-text">{tr.progression_preview_title}</h3>
      <p className="text-sm text-text">
        {isPaid ? tr.progression_preview_paid(preview.charge.credits) : tr.progression_preview_free}
      </p>
      <dl className="rounded-xl bg-surface-alt border border-border p-3 text-sm space-y-1">
        <div className="flex justify-between gap-3"><dt className="text-text-muted">{tr.progression_wallet_balance}</dt><dd className="font-medium text-text">{tr.progression_credits(preview.wallet_credits)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-text-muted">{tr.progression_free_remaining}</dt><dd className="font-medium text-text">{tr.progression_free_remaining_value(remaining, preview.allowance.free_limit)}</dd></div>
      </dl>
      <p className="text-xs text-text-muted">{tr.progression_preview_notice}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="px-4 py-2 text-sm rounded-lg border border-border text-text">
          {tr.progression_cancel}
        </button>
        <button type="button" onClick={onConfirm} disabled={isSubmitting} className="px-4 py-2 text-sm rounded-lg bg-accent text-white disabled:opacity-50">
          {isSubmitting ? tr.search_similar_loading : isPaid ? tr.progression_confirm_paid(preview.charge.credits) : tr.progression_confirm_free}
        </button>
      </div>
    </section>
  )
}
