# SEO Checklist for New Pages

Every new customer-facing page (`src/app/(customer)/**/page.tsx`) must pass this checklist before merging.

The ESLint rule `local-seo/require-page-metadata` (warn) will catch missing metadata automatically. Use `// @seo-allow-default` only if the page intentionally inherits metadata from its layout.

---

## Checklist

### 1. Title
- Export `generateMetadata` (preferred for dynamic data) or `export const metadata`
- Title must be specific to the page — not just the brand name
- Format: `<Page Name> | <Brand>` (template in `(customer)/layout.tsx`)
- Helper: `productMetadata()`, `shopMetadata()`, `guideMetadata()` in `src/lib/seo/metadata-defaults.ts`

### 2. Description
- Every indexable page must have a `description` (150–160 characters)
- Dynamic pages: derive from actual content (product description, shop address, guide excerpt)
- Static pages: write manually in `generateMetadata`

### 3. Canonical URL
- Always set `alternates.canonical` with an absolute URL (use `getSiteUrl()`)
- No query strings in canonical (canonical = the clean URL)
- For non-indexable pages (auth, search results with ?q=): no canonical needed, set `robots: { index: false }`

### 4. Open Graph (OG)
- Set `openGraph.title`, `openGraph.description`, `openGraph.type`
- For product and shop pages: include `openGraph.images` with the product/shop image URL
- Guide pages: `type: 'article'`

### 5. H1
- Every page must have exactly one `<h1>` element
- Guide pages: the page template renders `<h1>{meta.title}</h1>` — MDX `#` headings are remapped to `<h2>` by `mdx-components.tsx`
- Search page: uses `<h1 className="sr-only">` (visually hidden but SEO-visible)
- Never add a second `<h1>` in components rendered on the page

### 6. JSON-LD Structured Data
- Product pages: `buildProductSchema()` from `src/lib/structured-data.ts`
- Shop pages: `buildLocalBusinessSchema()` from `src/lib/structured-data.ts`
- Guide pages: Article schema is already in the page template
- Breadcrumb: `<Breadcrumb>` component automatically emits `BreadcrumbList` JSON-LD

### 7. Alt Texts
- All `<img>` and Next.js `<Image>` tags must have a non-empty `alt` attribute
- Exception: decorative images must have `aria-hidden="true"` (not empty `alt`)
- Shop logos: `alt={shop.name ?? ''}` — empty string is correct when no name (decorative fallback)
- Product images: `alt={name}` — always use the product name

### 8. Anchor Text for Icon-Links
- Every `<Link>` or `<a>` that contains only an SVG (icon) must also include `<span className="sr-only">visible text</span>`
- The SVG itself must have `aria-hidden="true"`
- `aria-label` alone is NOT sufficient for SEO anchor text — crawlers ignore it
- Example (correct):
  ```tsx
  <Link href="/search" aria-label={tr.search}>
    <svg aria-hidden="true">...</svg>
    <span className="sr-only">{tr.search}</span>
  </Link>
  ```

### 9. noindex Rules
- Auth pages (`/auth/**`): `robots: { index: false, follow: false }` — covered by auth layout
- Search with query params (`/search?q=...`): `robots: { index: false, follow: true }` — handled in `search/page.tsx`
- Shop-admin and system-admin pages: covered by their respective layouts/robots.ts
- Account pages (`/account/**`): should have `robots: { index: false, follow: false }`

### 10. Breadcrumbs
- Product, shop, and guide pages: use `<Breadcrumb items={[...]} />` from `src/components/ui/Breadcrumb.tsx`
- The component emits both HTML `<nav aria-label="breadcrumb">` and JSON-LD `BreadcrumbList`
- Minimum two levels: `Home > Page Name`
- For products with a category: `Home > Category > Product Name`

---

## Running the Audit

```bash
# Start the test server first
npm run dev:test

# In a second terminal:
pnpm seo:audit
# or with custom URL:
SEO_AUDIT_BASE_URL=http://localhost:3500 pnpm seo:audit
```

Output: `seo-audit-<date>.json` + `seo-audit-<date>.md` in the project root.

---

## Quick Reference: Page-Type Helpers

```ts
import { productMetadata, shopMetadata, guideMetadata, noIndexMetadata } from '@/lib/seo/metadata-defaults'

// Product page
export async function generateMetadata({ params }) {
  const product = await getProduct(params.slug)
  return productMetadata({
    name: product.name,
    slug: params.slug,
    description: product.description,
    priceDisplay: product.price ? `${product.price} €` : undefined,
    imageUrl: product.imageUrl,
  })
}

// Auth/private page (opt-in, layout already covers /auth/**)
export const metadata = noIndexMetadata('Page Title')
```

---

## Title & Description Length Guidelines (F6400, Ahrefs thresholds)

| Field | Min | Max | Violation |
|---|---|---|---|
| `<title>` | 50 chars | 60 chars | Ahrefs: "too short" / "too long" |
| `<meta description>` | 110 chars | 160 chars | Ahrefs: "too short" / "too long" |

Use the truncation helpers from `src/lib/seo/metadata-defaults.ts`:

```ts
import { truncateTitle, truncateDescription, padShopTitle } from '@/lib/seo/metadata-defaults'

// Product — remove price from title, truncate at word boundary
const suffix = ` | Pundo`
const truncated = truncateTitle(product.name, { max: 60, reserved: suffix.length })
const title = `${truncated}${suffix}`

// Shop — pad short names with city/category hints
const title = padShopTitle(shop.name, { city: cityHint, category: categoryHint }, lang, 'Pundo')

// Description — first 155 chars of product description
const description = rawDesc
  ? truncateDescription(rawDesc, { max: 155 })
  : tr.product_desc_fallback(name, brand)
```

---

## Open Graph — Complete Suite (AC-40)

Every indexable page must set all of these (use `buildCompleteOpenGraph` from `src/lib/seo/og-defaults.ts`):

**Required OG properties:** `og:title`, `og:description`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`, `og:url`, `og:type`, `og:site_name`, `og:locale`

**Required Twitter properties:** `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`

```ts
import { buildCompleteOpenGraph, pickShopFallbackOgImage } from '@/lib/seo/og-defaults'

// Product page example
const og = buildCompleteOpenGraph({
  title: pageTitle,
  description,
  url: `${siteUrl}/products/${slug}`,
  type: 'product',
  locale: lang,
  siteName: 'Pundo',
  image: {
    url: productImageUrl,
    width: 1200,
    height: 630,
    alt: product.name,
  },
})

return {
  title: pageTitle,
  description,
  alternates: { canonical: canonicalUrl },
  openGraph: og.openGraph,
  twitter: og.twitter,
  ...(og.other ? { other: og.other } : {}),
}
```

### Shop OG image fallback (no logo)

```ts
// Deterministic fallback: shopId % poolSize → stable across re-renders
const ogImage = logoUrl
  ? { url: logoUrl, width: 1200, height: 630, alt: shop.name }
  : pickShopFallbackOgImage(shop.id, siteUrl)
```

Pool: `public/og/shop-fallback-default.jpg` (1 image until Designer delivers 20-image pool).

### Guide page (article type)

```ts
const og = buildCompleteOpenGraph({
  ...,
  type: 'article',
  publishedTime: guide.meta.date,  // ISO 8601 → article:published_time in metadata.other
})
```

---

## Redirect Rules (AC-33/AC-34)

**Current state (verified 2026-05-16):**
- `next.config.ts` has **no `redirects()` block** — only `rewrites()` for API proxy
- **No `src/middleware.ts`** exists — no middleware-level redirects
- Trailing-slash redirects: Next.js default behaviour (308 redirect)
- External redirects: potentially from Caddy reverse proxy (not in this repo)

**Rule:** Never point internal `<Link href>` at a URL that redirects. Always use the final URL. Existing redirect rules (if added in the future) should stay for external backlink compatibility but must never be used in internal links.

---

## Orphan Page Rule (AC-31/AC-32)

Every page in `sitemap.xml` must have at least one internal link pointing to it. If a page has no inbound links from any other customer page, it is an orphan and loses Page Rank.

**Checklist for new pages:**
1. Add the page to `Footer.tsx` or to a relevant list/index page
2. Or add a contextual cross-link (e.g. "Related guides" in guide detail)
3. Run `pnpm seo:audit` — the "Orphan pages" section will confirm

**Accepted orphans:** `[]` (none — per BB/16.5., everything should have an inbound link)

---

## Sitemap Consistency (AC-30)

`src/app/sitemap.ts` uses `isIndexable(url)` from `src/lib/seo/metadata-defaults.ts` to filter every URL before including it. This guarantees that no noindex route can appear in the sitemap.

**isIndexable non-indexable patterns:**
- `/auth/*`, `/account/*`, `/shop-admin/*`, `/admin/*`, `/api/*`
- `/__playwright/*`, `/_next/*`
- Any URL with query params: `?q=`, `?shop_id=`, `?category_id=`, `?filter=`

---

## Running the Audits

```bash
# Start the test server first (port 3500)
npm run dev:test

# In a second terminal — SEO audit (title/desc/OG/H1/orphans/redirects/sitemap):
pnpm seo:audit

# Performance baseline (Lighthouse, requires Chrome):
pnpm seo:perf
```

Outputs in project root:
- `seo-audit-<date>.json` + `seo-audit-<date>.md`
- `perf-report-<date>.json` + `perf-report-<date>.md`
- `seo-perf-followups.md` (appended when routes hit "Poor" thresholds)
