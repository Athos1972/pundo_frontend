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
