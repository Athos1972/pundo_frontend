'use client'

import type { SearchResultItem } from '@/types/api'
import { isServiceResult } from '@/types/api'
import { ServiceResultCard } from '@/components/search/ServiceResultCard'
import { ProductCard } from '@/components/product/ProductCard'

interface ResultCardProps {
  item: SearchResultItem
  lang: string
}

/**
 * Discriminator switch between ServiceResultCard and ProductCard.
 *
 * Consumers (SearchContent) pass any SearchResultItem and this component
 * routes to the correct card type based on result_type.
 *
 * F5910 Service-Discovery-Bridge
 */
export function ResultCard({ item, lang }: ResultCardProps) {
  if (isServiceResult(item)) {
    return <ServiceResultCard item={item} lang={lang} />
  }
  return <ProductCard item={item} lang={lang} variant="horizontal" />
}
