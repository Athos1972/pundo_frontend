// src/lib/payment-methods.ts — F5300 Payment-Methods constant
// Clean Boundary: no t() / tAdmin() imports — labelKeys resolved by caller.
// Icons are pure SVG function components; no domain imports.

import type { ComponentType } from 'react'
import type { PaymentMethodValue } from '@/types/shop-admin'

export type { PaymentMethodValue }

export interface PaymentMethodDef {
  value: PaymentMethodValue
  /** Same key exists in both Customer (shop.ts) and Admin (shop-admin-common.ts) namespaces */
  labelKey: 'payment_cash' | 'payment_card' | 'payment_revolut' | 'payment_klarna'
  Icon: ComponentType<{ className?: string }>
}

function CashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}

function RevolutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h7a4 4 0 0 1 0 8H6z" />
      <path d="M6 12l5 8" />
    </svg>
  )
}

function KlarnaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v16M8 4v16M16 4c2 0 4 2 4 4s-2 4-4 4" />
    </svg>
  )
}

/** Ordered list of payment methods — order = display order. */
export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { value: 'cash',    labelKey: 'payment_cash',    Icon: CashIcon },
  { value: 'card',    labelKey: 'payment_card',    Icon: CardIcon },
  { value: 'revolut', labelKey: 'payment_revolut', Icon: RevolutIcon },
  { value: 'klarna',  labelKey: 'payment_klarna',  Icon: KlarnaIcon },
]
