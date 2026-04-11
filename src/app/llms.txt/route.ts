import { getSiteUrl } from '@/lib/seo'

export const revalidate = 86400

export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl()

  const content = `# Pundo

> Pundo ist ein Produkt- und Preislocator für lokale Shops in Larnaca, Zypern.
> Nutzer können Produkte und Dienstleistungen in ihrer Nähe finden, Preise vergleichen und Shops entdecken.

## Was ist Pundo?

Pundo hilft dabei, lokale Produkte und Angebote in Larnaca (Zypern) zu finden.
Die App zeigt Preise, Verfügbarkeit und Standorte von lokalen Shops.

## Öffentliche Seiten

- [Homepage](${siteUrl}/) — Startseite mit Produktsuche
- [Suche](${siteUrl}/search) — Produkt- und Preissuche mit Filtern
- [Sitemap](${siteUrl}/sitemap.xml) — Alle indizierten Shops und Produkte

## Inhalte

- Shops: Lokale Geschäfte in Larnaca mit Öffnungszeiten, Adresse und Angeboten
- Produkte: Produkte mit Preisen, Marken und Kategorieinformationen
- Angebote: Aktuelle Preise und Verfügbarkeit je Shop

## Sprachen

Pundo unterstützt: Englisch (en), Deutsch (de), Griechisch (el), Russisch (ru), Arabisch (ar), Hebräisch (he).
RTL-Layout für Arabisch und Hebräisch.

## Nicht öffentlich

- /admin — System-Administration (nicht öffentlich)
- /shop-admin — Shop-Betreiber-Portal (nicht öffentlich)
- /api — Backend-API-Proxy (nicht öffentlich)
- /account — Nutzerkonto (Login erforderlich)
- /auth — Authentifizierung

## Technisches

- Stack: Next.js, React, TypeScript
- Backend-API: REST, erreichbar via /api/v1/
- Datenbasis: Lokale Shops und Produkte in Larnaca, Zypern
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
