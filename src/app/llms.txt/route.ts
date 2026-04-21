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
- ShopOwner-Produkte unterstützen Staffelpreise (price_tiers): Preis je Einheit (per_hour, per_m2, per_day, per_km, per_piece, custom) mit Mengenrabatt-Stufen (min_quantity, max_quantity optional, price); mehrere Einheiten pro Produkt möglich (z. B. "Stunde + Tag")
- Dienstleistungen werden als ShopOwner-Produkte mit unit-basiertem Preis erfasst — ein Shop kann Produkte und Dienstleistungen parallel anbieten (Mixed Shop, F5400)

### Kategorien & Attribute
- Hierarchische Kategorienstruktur mit Vererbung: Produkt erbt Attribute der übergeordneten Kategorien
- Kategorie-Attribut-Definitionen: Jede Kategorie definiert eigene Schlüssel-Wert-Attribute (z. B. Tierart, Gewicht, Farbe)
- Attribute werden für Suche und Filterung genutzt

### Bewertungen
- Nutzer können Shops und Produkte mit Sternebewertungen (1–5) und Kommentaren bewerten
- Bewertungen sind öffentlich sichtbar auf Shop- und Produkt-Detailseiten

### Community Votes (F3200-3500)
- Eingeloggte Nutzer können Shops community-basierte Attribute vergeben: Sprachen (1–5 Sterne), Parkplatz, Preislevel, Lieferung, Click&Collect, Terrasse, Reservierungspflicht
- Attribute sind nach Shop-Typ gefiltert (z. B. Terrasse nur für Restaurants/Cafés/Bars)
- Aggregierte Ergebnisse (weighted_avg) öffentlich sichtbar; Abstimmung nur für eingeloggte Nutzer

### Trust-System & Gamification (F3200)
- Eingeloggte Nutzer erhalten Trust-Punkte (Credits) und Trust-Level (1–3) durch Community-Aktivitäten (Votes, Reviews)
- Trust-Level beeinflusst Gewichtung der Community-Votes (weighted_avg)
- Badges für besondere Beiträge: island_hero, local_legend, walker
- Trust-Profil im Nutzerkonto sichtbar

### Favoriten & Preisbenachrichtigungen
- Eingeloggte Nutzer können Produkte als Favoriten speichern (Herzchen-Icon auf Produktkarten)
- Favoriten-Verwaltung im Nutzerkonto: Alert-Intervalle pro Favorit (sofort / täglich / wöchentlich / nie)
- Globale Benachrichtigungseinstellung übersteuerbar pro Favorit

### Ähnlichkeitssuche (Homesick)
- Nutzer können per Freitexteingabe ähnliche Produkte suchen (semantische Suche)
- Rate-limitiert: tägliches Kontingent pro Nutzer sichtbar im Modal

## Sprachen

Pundo unterstützt: Englisch (en), Deutsch (de), Griechisch (el), Russisch (ru), Arabisch (ar), Hebräisch (he).
RTL-Layout für Arabisch und Hebräisch.

## Nicht öffentlich

- /admin — System-Administration (nicht öffentlich)
- /shop-admin — Shop-Betreiber-Portal: Registrierung, Approval-Flow, Dashboard zur Verwaltung von Angeboten und Produkten (Login erforderlich)
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
