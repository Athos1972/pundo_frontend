import { getSiteUrl } from '@/lib/seo'

export const revalidate = 86400

export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl()

  const content = `# Pundo

> Pundo ist ein Produkt- und Preislocator für lokale Shops und Online-Händler in Larnaca, Zypern.
> Nutzer können Produkte und Dienstleistungen in ihrer Nähe finden, Preise vergleichen, Shops bewerten und entdecken.

## Was ist Pundo?

Pundo hilft dabei, lokale Produkte und Angebote in Larnaca (Zypern) zu finden.
Die App zeigt Preise, Verfügbarkeit und Standorte von lokalen und Online-Shops.
Nutzer können Shops und Produkte bewerten und kommentieren.

## Öffentliche Seiten

- [Homepage](${siteUrl}/) — Startseite mit Produktsuche
- [Suche](${siteUrl}/search) — Produkt- und Preissuche mit Filtern
- [Sitemap](${siteUrl}/sitemap.xml) — Alle indizierten Shops und Produkte

## Inhalte

### Shops
- Lokale Shops (shop_type: local): Geschäfte in Larnaca mit Adresse, Öffnungszeiten und Angeboten
- Online-Shops (shop_type: online_only): Händler ohne physischen Standort, nur Lieferung

### Produkte & Preise
- Produkte mit Marken, Kategorieinformationen und Attributen
- Preistypen je Angebot:
  - fixed — fester Preis
  - on_request — Preis auf Anfrage
  - free — kostenlos
  - variable — variabler Preis (z. B. nach Gewicht/Menge)
- price_note: optionale Freitext-Ergänzung zum Preis (z. B. "pro kg", "ab Lager")

### Kategorien & Attribute
- Hierarchische Kategorienstruktur mit Vererbung: Produkt erbt Attribute der übergeordneten Kategorien
- Kategorie-Attribut-Definitionen: Jede Kategorie definiert eigene Schlüssel-Wert-Attribute (z. B. Tierart, Gewicht, Farbe)
- Attribute werden für Suche und Filterung genutzt

### Bewertungen
- Nutzer können Shops und Produkte mit Sternebewertungen (1–5) und Kommentaren bewerten
- Bewertungen sind öffentlich sichtbar auf Shop- und Produkt-Detailseiten

## Sprachen

Pundo unterstützt: Englisch (en), Deutsch (de), Griechisch (el), Russisch (ru), Arabisch (ar), Hebräisch (he).
RTL-Layout für Arabisch und Hebräisch.

## Nicht öffentlich

- /admin — System-Administration (nicht öffentlich)
- /shop-admin — Shop-Betreiber-Portal: Registrierung, Approval-Flow, Dashboard zur Verwaltung von Angeboten und Produkten (Login erforderlich)
- /api — Backend-API-Proxy (nicht öffentlich)
- /account — Nutzerkonto (Login erforderlich)
- /auth — Authentifizierung

## Technisches

- Stack: Next.js, React, TypeScript
- Backend-API: REST, erreichbar via /api/v1/
- Datenbasis: Lokale und Online-Shops sowie Produkte in Larnaca, Zypern
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
