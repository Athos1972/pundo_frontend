# Analytics

## Überblick

pundo_frontend verwendet **[Plausible Analytics](https://plausible.io)** — ein cookieloses, datenschutzkonformes Tool für Seitenaufruf-Tracking.

- Kein Cookie-Consent-Banner erforderlich
- Keine Einzelnutzer-Verfolgung
- Keine Datenweitergabe an Dritte
- Kein npm-Paket — wird als CDN-Script geladen

---

## Implementierung

**Datei:** `src/app/(customer)/layout.tsx` (Zeilen 57–64)

```tsx
{process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
  <Script
    defer
    data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
    src="https://plausible.io/js/script.js"
    strategy="afterInteractive"
  />
)}
```

Das Script wird **nur geladen**, wenn `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` gesetzt ist. Ist die Variable leer (z. B. lokal), passiert nichts.

**Scope:** Nur das Customer-Layout — Shop-Admin und System-Admin tracken nichts.

---

## Konfiguration

In `.env.local.example`:

```env
# Plausible Analytics (cookieless, no consent banner needed)
# Set to your domain to enable analytics. Leave unset to disable (e.g. in development).
# NEXT_PUBLIC_PLAUSIBLE_DOMAIN=pundo.cy
```

| Umgebung       | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` |
|----------------|-------------------------------|
| Produktion     | `pundo.cy`                    |
| Entwicklung    | nicht gesetzt (disabled)      |
| Test / E2E     | nicht gesetzt (disabled)      |

---

## Custom Events

Aktuell werden **keine Custom Events** getrackt — nur automatische Seitenaufrufe via Plausible-Script.

Falls Custom Events benötigt werden, kann `plausible()` direkt aufgerufen werden:

```ts
// Beispiel (noch nicht implementiert)
window.plausible?.('checkout_started', { props: { shop: slug } })
```

---

## Datenschutz & rechtliche Verankerung

Der Einsatz von Plausible ist in der **Privacy Policy** dokumentiert (`src/lib/legal-content.ts`), in allen 6 unterstützten Sprachen (EN, DE, RU, EL, AR, HE):

> "We use Plausible Analytics (plausible.io) to understand how our site is used. Plausible is cookieless and privacy-friendly — it does not use cookies, does not track individual users, and does not share data with third parties. No cookie consent is required."

---

## Dashboard-Zugang

Das Plausible-Dashboard für `pundo.cy` ist unter [plausible.io](https://plausible.io) erreichbar (Login-Credentials außerhalb dieses Repos).
