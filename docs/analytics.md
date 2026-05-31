# Analytics

## Überblick

pundo_frontend verwendet zwei unabhängige Analytics-Systeme:

| System | Zweck | Consent nötig? |
|---|---|---|
| **Plausible Analytics** | Cookieloses Seitenaufruf-Tracking | Nein |
| **Meta (Facebook) Pixel** | Ad-Conversion-Tracking | Ja — Marketing-Opt-in |

---

## 1. Plausible Analytics

Cookielos, selbst-gehostet auf `plausible.pundo.cy`. Kein Consent-Banner erforderlich.

**Brand-Config:** `brand.analytics.plausibleDomain` + `plausibleHost`

**Rendering:** `src/app/(customer)/layout.tsx` — wird als `next/script afterInteractive` geladen. Nur für Brands mit gesetztem `plausibleDomain`.

**Custom Events:** `window.plausible?.('event_name', { props: { ... } })`

---

## 2. Meta (Facebook) Pixel — Consent-Gate

Der Meta-Pixel wird **ausschließlich nach Marketing-Opt-in** geladen. Kein Pre-Load, kein cookieloses Tracking.

### Brand-Config

```typescript
// src/config/brands/pundo.ts
analytics: {
  metaPixelId: '870274585468299',
}
```

Nur Brands mit gesetztem `metaPixelId` laden den Pixel und zeigen die Marketing-Kategorie im Consent-Banner.

### Komponenten

| Datei | Zweck |
|---|---|
| `src/lib/consent.ts` | `ConsentState`-Typ, Cookie-IO, Schema-Version |
| `src/lib/meta-pixel.ts` | `trackPixelEvent()` no-op-safe Wrapper |
| `src/components/consent/ConsentContext.tsx` | `ConsentProvider` + `useConsent()` |
| `src/components/consent/CookieConsentBanner.tsx` | Bottom-Bar-Banner, RTL-fähig, a11y |
| `src/components/consent/MetaPixel.tsx` | Conditional `next/script` Injector |
| `src/components/consent/PixelViewContent.tsx` | Client-Wrapper für ViewContent-Events |

### Consent-Cookie

- Name: `app_cookie_consent`
- Format: `{"v":1,"necessary":true,"statistics":true,"marketing":false}` (URL-encoded)
- MaxAge: 15 552 000 s (6 Monate)
- SameSite: Lax

### Standard-Events

| Event | Ausgelöst in |
|---|---|
| `PageView` | `MetaPixel.tsx` beim Init |
| `Search` | `SearchContent.tsx` — bei geänderter Query |
| `ViewContent` | `PixelViewContent.tsx` auf Produkt-/Shop-Detailseite |

### CSP

`src/proxy.ts` erweitert `connect-src` und `img-src` um Meta-Hosts **nur wenn** `brand.analytics.metaPixelId` gesetzt ist:
- `connect-src`: `https://www.facebook.com https://connect.facebook.net`
- `img-src`: `https://www.facebook.com`

`script-src` braucht keinen Meta-Host — `strict-dynamic` propagiert Trust von der nonce-signierten Inline-Init auf `fbevents.js`.

### Widerruf

Footer-Link „Cookie-Einstellungen" öffnet den Banner erneut. Bei Widerruf: `fbq('consent','revoke')` + best-effort Löschung von `_fbp`/`_fbc`.

---

## Dashboard-Zugang

- **Plausible:** `https://plausible.pundo.cy` (Credentials außerhalb dieses Repos)
- **Meta Pixel:** Facebook Ads Manager → Events Manager → Pixel `870274585468299`
