import { getSiteUrl } from '@/lib/seo'

export const revalidate = 86400

export async function GET(): Promise<Response> {
  const siteUrl = getSiteUrl()

  const content = `# Pundo

> Pundo ist ein Produkt- und Preislocator sowie Expat-Guide für lokale Shops und Online-Händler in Larnaca, Zypern.
> Nutzer können Produkte und Dienstleistungen in ihrer Nähe finden, Preise vergleichen, Shops bewerten und entdecken.

## Was ist Pundo?

Pundo hilft dabei, lokale Produkte und Angebote in Larnaca (Zypern) zu finden.
Die App zeigt Preise, Verfügbarkeit und Standorte von lokalen und Online-Shops.
Nutzer können Shops und Produkte bewerten, kommentieren und als Favoriten speichern.
Außerdem bietet Pundo einen Expat-Guide mit praktischen Ratgebern zum Leben in Zypern.

## Öffentliche Seiten

- [Homepage](${siteUrl}/) — Startseite mit Produktsuche
- [Suche](${siteUrl}/search) — Produkt- und Preissuche mit Filtern
- [Shops](${siteUrl}/shops) — Übersicht aller lokalen und Online-Shops
- [Blog](${siteUrl}/blog) — Expat-Blog mit Artikeln zu Leben, Einkaufen und Alltag in Zypern
- [Expat-Guides](${siteUrl}/guides) — Praktische Ratgeber für Expats in Zypern
- [Homesick / Ähnlichkeitssuche](${siteUrl}/homesick) — Semantische Suche nach ähnlichen Produkten aus der Heimat
- [Für Shops](${siteUrl}/for-shops) — Informationen für Shop-Betreiber zur Registrierung auf Pundo
- [Über Pundo](${siteUrl}/about) — Über das Projekt
- [Hilfe](${siteUrl}/help) — FAQ und Hilfe zur Nutzung
- [Kontakt](${siteUrl}/contact) — Kontaktformular
- [Impressum](${siteUrl}/legal/imprint) — Impressum
- [Datenschutz](${siteUrl}/legal/privacy) — Datenschutzerklärung
- [AGB](${siteUrl}/legal/terms) — Allgemeine Geschäftsbedingungen
- [Sitemap](${siteUrl}/sitemap.xml) — Alle indizierten Shops und Produkte

## Inhalte

### Shops
- Lokale Shops (shop_type: local): Geschäfte in Larnaca mit Adresse, Öffnungszeiten und Angeboten
- Online-Shops (shop_type: online_only): Händler ohne physischen Standort, nur Lieferung
- Shop-Detailseiten zeigen Angebote, Bewertungen, Community-Attribute und ähnliche Shops in der Nähe

### Produkte & Preise
- Produkte mit Marken, Kategorieinformationen und Attributen
- Preistypen je Angebot:
  - fixed — fester Preis
  - on_request — Preis auf Anfrage
  - free — kostenlos
  - variable — variabler Preis (z. B. nach Gewicht/Menge)
- price_note: optionale Freitext-Ergänzung zum Preis (z. B. "pro kg", "ab Lager")
- ShopOwner-Produkte unterstützen Staffelpreise (price_tiers): Preis je Einheit (per_hour, per_m2, per_day, per_km, per_piece, custom) mit Mengenrabatt-Stufen (min_quantity, max_quantity optional, price); mehrere Einheiten pro Produkt möglich (z. B. "Stunde + Tag")
- Dienstleistungen werden als ShopOwner-Produkte mit unit-basiertem Preis erfasst — ein Shop kann Produkte und Dienstleistungen parallel anbieten (Mixed Shop)

### Kategorien & Attribute
- Hierarchische Kategorienstruktur mit Vererbung: Produkt erbt Attribute der übergeordneten Kategorien
- Kategorie-Attribut-Definitionen: Jede Kategorie definiert eigene Schlüssel-Wert-Attribute (z. B. Tierart, Gewicht, Farbe)
- Attribute werden für Suche und Filterung genutzt

### Expat-Guides
- Praktische Ratgeber für Expats und Zuzügler in Zypern, verfügbar in mehreren Sprachen
- Kategorien: Behörden & Verwaltung, Mobilität, Gesundheit, Haustiere, Wohnen & Infrastruktur
- Beispielthemen: Fahrzeugzulassung, Steuernummer (TIC), Bankkonten, GESY-Gesundheitssystem, Notfalldienste, Hunde und Katzen in Zypern, Internet, Wasser, Photovoltaik, Paketzustellung

### Blog
- Artikel zu Expat-Leben, lokalem Einkaufen und Alltag in Zypern
- Mehrsprachige Artikel mit Kategorisierung und Lesezeit-Angabe

### Bewertungen
- Nutzer können Shops und Produkte mit Sternebewertungen (1–5) und Kommentaren bewerten
- Bewertungen sind öffentlich sichtbar auf Shop- und Produkt-Detailseiten

### Community Votes
- Eingeloggte Nutzer können Shops community-basierte Attribute vergeben: Sprachen (1–5 Sterne), Parkplatz, Preislevel, Lieferung, Click&Collect, Terrasse, Reservierungspflicht
- Attribute sind nach Shop-Typ gefiltert (z. B. Terrasse nur für Restaurants/Cafés/Bars)
- Aggregierte Ergebnisse (weighted_avg) öffentlich sichtbar; Abstimmung nur für eingeloggte Nutzer

### Trust-System & Gamification
- Eingeloggte Nutzer erhalten Trust-Punkte (Credits) und Trust-Level (1–3) durch Community-Aktivitäten (Votes, Reviews)
- Trust-Level beeinflusst Gewichtung der Community-Votes (weighted_avg)
- Badges für besondere Beiträge: island_hero, local_legend, walker
- Trust-Profil im Nutzerkonto sichtbar

### Favoriten & Preisbenachrichtigungen
- Eingeloggte Nutzer können Produkte als Favoriten speichern (Herzchen-Icon auf Produktkarten)
- Favoriten-Verwaltung im Nutzerkonto: Alert-Intervalle pro Favorit (sofort / täglich / wöchentlich / nie)
- Globale Benachrichtigungseinstellung übersteuerbar pro Favorit

### Ähnlichkeitssuche (Homesick)
- Nutzer können per Freitexteingabe ähnliche Produkte aus ihrer Heimat suchen (semantische Suche)
- Rate-limitiert: tägliches Kontingent pro Nutzer sichtbar im Modal
- Erreichbar unter /homesick und /nostalgia (Alias)

## Sprachen

Pundo unterstützt: Englisch (en), Deutsch (de), Griechisch (el), Russisch (ru), Arabisch (ar), Hebräisch (he).
RTL-Layout für Arabisch und Hebräisch.

## Nicht öffentlich

- /admin — System-Administration (nicht öffentlich)
- /shop-admin — Shop-Betreiber-Portal: Registrierung, Approval-Flow, Dashboard zur Verwaltung von Angeboten, Produkten, Öffnungszeiten, Profil, Bewertungen und API-Keys (Login erforderlich)
- /api — Backend-API-Proxy (nicht öffentlich)
- /account — Nutzerkonto (Login erforderlich): Profil, Sicherheit, Reviews, Favoriten, Trust-Profil
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
