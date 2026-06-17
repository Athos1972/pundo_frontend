import Link from 'next/link'
import { getSiteUrl } from '@/lib/seo'
import { isIndexable } from '@/lib/seo/metadata-defaults'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

/**
 * Universal Breadcrumb component.
 * Renders HTML nav with Schema.org BreadcrumbList JSON-LD.
 *
 * JSON-LD uses absolute URLs and filters out non-indexable items
 * (e.g. ?category_id= search pages) so Google does not flag broken links.
 * Visual breadcrumb nav is unaffected and keeps relative hrefs.
 *
 * Usage:
 *   <Breadcrumb items={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Products', href: '/products' },
 *     { label: 'Widget 3000' }, // no href = current page
 *   ]} />
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null

  const siteUrl = getSiteUrl()

  // For JSON-LD: filter out items pointing at noindex URLs (e.g. ?category_id=)
  const indexableItems = items.filter(
    (item) => !item.href || isIndexable(item.href).indexable,
  )

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: indexableItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href
        ? {
            item: item.href.startsWith('http')
              ? item.href
              : `${siteUrl}${item.href.startsWith('/') ? '' : '/'}${item.href}`,
          }
        : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <span aria-hidden="true" className="text-text-light">/</span>
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-accent transition-colors truncate max-w-[160px]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={isLast ? 'text-text font-medium truncate max-w-[200px]' : 'truncate max-w-[160px]'}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
