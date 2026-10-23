import type { Metadata } from 'next'
import { ProgressionUnsubscribeClient } from './ProgressionUnsubscribeClient'

// @seo-allow-default — public noindex confirmation page reached only from email.
export const metadata: Metadata = {
  title: 'Email preferences',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{ token?: string | string[]; brand?: string | string[]; lang?: string | string[] }>

const first = (value: string | string[] | undefined): string => Array.isArray(value) ? (value[0] ?? '') : (value ?? '')

// Public and deliberately outside /{lang}: it is opened from an email before a
// customer session exists. The opaque signed token is never rendered as text.
export default async function ProgressionUnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams
  return <ProgressionUnsubscribeClient token={first(query.token)} brand={first(query.brand)} lang={first(query.lang)} />
}
