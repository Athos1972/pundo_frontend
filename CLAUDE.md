@AGENTS.md

## SEO — Pflicht für jede neue Customer-Page

Jede neue Customer-Page (`src/app/(customer)/**/page.tsx`) **muss** die SEO-Checkliste in [`docs/seo.md`](docs/seo.md) erfüllen.

Kurzfassung:
1. `generateMetadata` oder `export const metadata` mit eigenem `title` (nicht Brand-Default)
2. `description` (150–160 Zeichen)
3. `alternates.canonical` (absolut, ohne Query-String)
4. `openGraph` vollständig (nutze `buildCompleteOpenGraph` aus `src/lib/seo/og-defaults.ts`)
5. Genau ein `<h1>`
6. JSON-LD je nach Page-Typ (Product, Shop, Guide, BreadcrumbList)
7. Alle `<img>` mit non-empty `alt` (außer `aria-hidden="true"`)
8. Icon-Links mit `<span className="sr-only">` Anchor-Text + `aria-hidden="true"` am SVG

Die ESLint-Rule `local-seo/require-page-metadata` (warn) fängt fehlende Metadata automatisch ab.
Opt-out nur mit `// @seo-allow-default` direkt vor dem Default-Export (z.B. wenn das Layout-Level bereits noindex setzt).
