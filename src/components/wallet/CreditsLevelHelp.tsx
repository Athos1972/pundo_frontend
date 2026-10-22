'use client'

import { useEffect, useRef, useState } from 'react'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { progressionAllowanceText, progressionEarningText, progressionHelpDetails, progressionHelpText, progressionIntroduction, progressionPriceText } from '@/lib/progression-help-text'

interface HelpRules {
  ledger_enabled: boolean
  earnings: { action: string; xp: number; credits: number }[]
  prices: { homesick_credits: number; mcp_calls_per_block: number; mcp_credits_per_100_calls: number; product_mail_credits: number }
  allowances: { homesick_free_daily: number; homesick_free_monthly: number; mcp_free_calls_daily: number; product_mail_free_monthly: number }
}

export function CreditsLevelHelp({ lang, brand, legacyAccount = false }: { lang: Lang; brand: string; legacyAccount?: boolean }) {
  const text = progressionHelpText[lang]
  const detail = progressionHelpDetails[lang][brand === 'naidivse' ? 'naidivse' : 'pundo']
  const [open, setOpen] = useState(false)
  const [rules, setRules] = useState<HelpRules | null>(null)
  const [failed, setFailed] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLSpanElement>(null)
  const currency = detail.names.currency.replace(/\s*\(.+\)$/, '')
  const close = () => { setOpen(false); openerRef.current?.focus() }
  const isolateNumbers = (value: string) => {
    if (lang !== 'ar' && lang !== 'he') return value
    return value.split(/(\d+(?:[.,]\d+)?)/).map((part, index) =>
      /^\d/.test(part) ? <bdi dir="ltr" key={index}>{part}</bdi> : part,
    )
  }

  useEffect(() => {
    if (!open || rules) return
    void fetch(`/api/customer/customer/progression/help?brand=${encodeURIComponent(brand)}`, { headers: { 'Accept-Language': lang } })
      .then((response) => response.ok ? response.json() : null)
      .then((body: HelpRules | null) => {
        if (body === null) { setFailed(true); return }
        setRules(body)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [brand, lang, open, rules])

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); openerRef.current?.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return <span ref={rootRef} className="relative inline-flex">
    <button ref={openerRef} type="button" onClick={() => setOpen(true)} aria-label={`${detail.names.rank}: ${detail.names.currency}`} aria-expanded={open}
      className="ms-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold text-text-muted hover:text-text">
      <span aria-hidden="true">i</span>
    </button>
    {open && <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="false" aria-label={detail.names.rank}
      className="absolute end-0 z-20 mt-7 max-h-[min(70vh,32rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-surface p-4 text-start shadow-lg">
      <div className="flex items-start justify-between gap-3"><h3 className="font-bold text-text">{detail.names.rank} · {detail.names.currency}</h3><button type="button" onClick={close} aria-label={detail.names.rank} className="text-text-muted hover:text-text">×</button></div>
      <p className="mt-2 text-sm text-text">{progressionIntroduction(lang, brand === 'naidivse' ? 'naidivse' : 'pundo')}</p>
      {legacyAccount && <p className="mt-2 text-xs text-text-muted">{detail.legacy}</p>}
      {!rules && <p className="mt-3 text-sm text-text-muted">{failed ? detail.unavailable : detail.loading}</p>}
      {rules && <div className="mt-3 space-y-3 text-sm text-text">
        <div><h4 className="font-semibold">{text.earn}</h4><ul className="mt-1 list-disc ps-5">{rules.earnings.map((entry) => <li key={entry.action}>{isolateNumbers(progressionEarningText(lang, brand === 'naidivse' ? 'naidivse' : 'pundo', text.actions[entry.action], entry.xp, entry.credits))}</li>)}</ul></div>
        <div><h4 className="font-semibold">{text.costs}</h4><p>{isolateNumbers(progressionPriceText(lang, brand === 'naidivse' ? 'naidivse' : 'pundo', rules.prices.homesick_credits, rules.prices.mcp_credits_per_100_calls, rules.prices.mcp_calls_per_block, rules.prices.product_mail_credits))}</p></div>
        <div><h4 className="font-semibold">{text.free}</h4><p>{isolateNumbers(progressionAllowanceText(lang, brand === 'naidivse' ? 'naidivse' : 'pundo', rules.allowances.homesick_free_daily, rules.allowances.homesick_free_monthly, rules.allowances.mcp_free_calls_daily, rules.allowances.product_mail_free_monthly))}</p><p className="mt-1 text-text-muted">{rules.ledger_enabled ? text.enabled : text.disabled}</p></div>
      </div>}
      <a href={`${localePath(lang, '/help')}#credits-and-levels`} className="mt-3 inline-block text-sm font-medium text-accent underline">{detail.more ?? text.more}</a>
    </section>}
  </span>
}
