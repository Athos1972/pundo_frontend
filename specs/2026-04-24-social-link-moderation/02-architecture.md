# Architecture — Social-Link-Moderation (Frontend)

**Feature-Slug:** `2026-04-24-social-link-moderation`
**Datum:** 2026-04-24
**Design-Quelle:** `specs/2026-04-24-social-link-moderation/01-design.md`

> ⚠️ **Backend-Architect läuft parallel.** Diese Architektur fixiert nur die Frontend-Seite.
> Backend-Kontrakt (422-Payload, `/admin/social-link-rules` CRUD) stammt aus Design Kap. 4;
> die exakten Feldnamen sind in Abschnitt 3 unten als verbindlicher Frontend-Erwartungswert
> spezifiziert. Abweichungen → Backend-Architect muss korrigieren.

---

## 1. Affected Modules / Files

### Geändert (Shop-Admin-Seite)

| Datei | Änderung |
|---|---|
| `src/components/ui/SocialLinksEditor.tsx` | Neuer optionaler Prop `serverErrors?: Record<string, SocialLinkFieldError>` — rendert Server-Fehler pro Plattform-Key (inkl. `other`). Bestehende Client-Validierung bleibt unverändert. Layout mit Tailwind `rtl:` für lange Fehlermeldungen. |
| `src/components/shop-admin/SocialLinksEditor.tsx` | Re-Export erweitern (Typ `SocialLinkFieldError`). Clean-Boundary-Hinweis: Datei ist weiterhin nur Wrapper auf `ui/SocialLinksEditor`. |
| `src/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm.tsx` | Save-Handler parst 422-Response. Bei `error === "social_link_blocked"` mapped auf `serverErrors[key]` im Editor-State. Restliche Felder bleiben im Formular erhalten. Bei Erfolg: `serverErrors` zurücksetzen. |
| `src/lib/shop-admin-translations.ts` | Neue Keys (siehe §5) in `en`, `de`, `el`, `ru`, `ar`, `he`. |
| `src/types/shop-admin.ts` | Neue exportierte Typen `SocialLinkBlockedError`, `SocialLinkFieldError`, `SocialLinkBlockCategory`. |

### Neu (System-Admin-Seite)

| Datei | Zweck |
|---|---|
| `src/app/(system-admin)/admin/(portal)/social-link-rules/page.tsx` | Server-Component: lädt Blocklist-Regeln über `system-admin-api`, rendert `RuleList` + „Neu"-Button. |
| `src/app/(system-admin)/admin/(portal)/social-link-rules/RuleList.tsx` | Client-Component: Tabelle (Host, Kategorie, Source, Notiz, Erstellt) mit Delete-Button je Zeile. Nur `source === 'admin'` ist löschbar; `external` Einträge sind read-only markiert. |
| `src/app/(system-admin)/admin/(portal)/social-link-rules/RuleForm.tsx` | Client-Component: Eingabe-Formular (Host, Kategorie-Select, Notiz). Inline-Validierung. POST an `/api/admin/social-link-rules`. |
| `src/app/(system-admin)/admin/(portal)/social-link-rules/new/page.tsx` | Dünne Seite, rendert `RuleForm` im Create-Modus. |
| `src/lib/system-admin-api.ts` | Neue Server-Funktionen: `getSocialLinkRules`, `getSocialLinkRuleCategories`. (Create/Delete laufen client-seitig über `/api/admin/[...path]`-Proxy.) |
| `src/lib/system-admin-translations.ts` | Neue Keys (siehe §5). |
| `src/types/system-admin.ts` | Typen `SysAdminSocialLinkRule`, `SocialLinkRuleCategory`, `SysAdminSocialLinkRuleCreate`. |
| `src/components/admin/AdminNav.tsx` *(oder wo das System-Admin-Nav liegt — vor Implementation durch Coder verifizieren)* | Navigationseintrag „Social-Link-Regeln". |

### Unberührt, aber relevant

- `src/app/api/admin/[...path]/route.ts` — Catch-all-Proxy trägt Admin-Auth automatisch für die neuen CRUD-Requests an. Kein Change nötig.
- `src/app/api/shop-admin/[...path]/route.ts` — dito für Shop-Profile-Save.

---

## 2. Data Model Changes (TypeScript-Typen)

### `src/types/shop-admin.ts` (ergänzen)

```ts
export type SocialLinkBlockCategory =
  | 'adult'
  | 'gambling'
  | 'hate'
  | 'illegal'
  | 'malware'
  | 'shortener_unresolvable'
  | 'custom'

/** Backend 422 body when a shop PATCH is rejected due to social-link content. */
export interface SocialLinkBlockedError {
  error: 'social_link_blocked'
  key: string                   // platform key, e.g. 'facebook' or free-form 'xing'
  category: SocialLinkBlockCategory
  resolved_host?: string | null // final host after shortener unwind, if applicable
  via_shortener?: boolean
}

/** Per-field error shape consumed by SocialLinksEditor. */
export interface SocialLinkFieldError {
  category: SocialLinkBlockCategory
  resolved_host?: string | null
  via_shortener?: boolean
}
```

### `src/types/system-admin.ts` (ergänzen)

```ts
export type SocialLinkRuleCategory =
  | 'adult' | 'gambling' | 'hate' | 'illegal' | 'malware' | 'custom'

export type SocialLinkRuleSource = 'external' | 'admin'

export interface SysAdminSocialLinkRule {
  id: number
  host: string                 // e.g. 'onlyfans.com' (normalized, lowercase, no scheme)
  category: SocialLinkRuleCategory
  source: SocialLinkRuleSource
  note: string | null
  external_batch_id: string | null
  created_at: string
}

export interface SysAdminSocialLinkRuleCreate {
  host: string
  category: SocialLinkRuleCategory
  note?: string | null
}
```

Keine DB-Migrationen im Frontend. Backend-Tabellen siehe Design Kap. 4 (`social_link_blocklist`, `social_link_shortener_hosts`).

---

## 3. API Contracts (Frontend-Erwartung)

### 3.1 Shop-Profile-Save (geändert)

- Endpoint: `PATCH /api/v1/shop-owner/shop` *(bereits existierend)*
- Proxy: `/api/shop-admin/shop` (Client ruft den, Proxy leitet weiter)
- **Neuer Failure-Fall:** HTTP `422` mit JSON-Body:
  ```json
  {
    "error": "social_link_blocked",
    "key": "xing",
    "category": "adult",
    "resolved_host": "pornhub.com",
    "via_shortener": true
  }
  ```
- Andere Fehlercodes bleiben wie zuvor (`400`, `401`, `500`).
- Erfolg (`200`): unverändert.

### 3.2 System-Admin Blocklist-CRUD (neu)

Alle relativ zu Backend `/api/v1/admin`:

| Method | Path | Query / Body | Response |
|---|---|---|---|
| `GET` | `/social-link-rules` | `q?`, `category?`, `source?`, `limit?`, `offset?` | `PaginatedResponse<SysAdminSocialLinkRule>` |
| `GET` | `/social-link-rules/categories` | — | `{ categories: SocialLinkRuleCategory[] }` |
| `POST` | `/social-link-rules` | `SysAdminSocialLinkRuleCreate` | `SysAdminSocialLinkRule` (201) |
| `DELETE` | `/social-link-rules/{id}` | — | `204` |
| `PATCH` | `/social-link-rules/{id}` *(optional, Phase 2)* | `{ category?, note? }` | `SysAdminSocialLinkRule` |

Fehlerfälle:
- `409` bei POST mit duplicate host → Frontend zeigt Inline-Fehler „Host existiert bereits".
- `403` wenn Admin-Rolle nicht superadmin/editor (analog zu bestehenden Admin-Endpoints).
- `422` bei ungültigem Host-Format.

Server-side Frontend-Aufrufe (`src/lib/system-admin-api.ts`) nur für `GET`.
Client-Mutationen (`POST`, `DELETE`) über `fetch('/api/admin/social-link-rules'...)` (Proxy), analog zum vorhandenen Shop-Admin-Muster.

---

## 4. Fehler-Handling-Strategie

### 4.1 Flow im ProfileForm

1. Submit → `fetch('/api/shop-admin/shop', { method: 'PATCH', ... })`.
2. Wenn `res.status === 422`:
   - `const body = await res.json()`.
   - Wenn `body.error === 'social_link_blocked'`:
     - `setServerErrors(prev => ({ ...prev, [body.key]: { category, resolved_host, via_shortener } }))`
     - Kein Toast „Saved". Stattdessen dezenter Error-Toast mit der kategoriespezifischen Meldung.
     - **Formular bleibt gefüllt**, User kann den betreffenden Link korrigieren.
3. Bei erfolgreichem Save: `setServerErrors({})`.
4. Beim nächsten `onChange` des betroffenen Feldes → entsprechenden Server-Error löschen (optimistic), damit die rote Meldung beim Tippen verschwindet.

### 4.2 Mehrere blockierte Links gleichzeitig

Backend liefert laut aktuellem Design nur **einen** `key` pro 422. Frontend unterstützt aber `Record<key, SocialLinkFieldError>`, damit ein späterer Backend-Change (mehrere Verstöße in einem Response) nur eine Typ-Erweiterung erfordert. Wenn Backend später `errors: SocialLinkBlockedError[]` schickt, ist der Mapping-Code eine ein-Zeilen-Änderung.

### 4.3 Rendering im SocialLinksEditor

- Roter `border-red-400`-Rahmen + rote Hinweiszeile unter dem jeweiligen URL-Feld.
- Meldung = `tr.social_blocked_<category>` (siehe §5).
- Wenn `via_shortener === true` zusätzlich Zeile `tr.social_blocked_via_shortener` mit eingefügtem `resolved_host` (escaped).
- Kein Aufruf von `onValidChange(false)` nötig — der Save-Button reagiert bereits auf HTTP-Fehler; Server-Error ist „extern", nicht Teil der Client-Validität.

---

## 5. i18n Strings

### Shop-Admin (`src/lib/shop-admin-translations.ts`)

Neue Keys — jeweils in allen sechs Sprachen (en/de/el/ru/ar/he):

| Key | Zweck |
|---|---|
| `social_blocked_generic` | Fallback-Text „This link is not allowed." |
| `social_blocked_adult` | „Adult content is not permitted." |
| `social_blocked_gambling` | „Gambling content is not permitted." |
| `social_blocked_hate` | „Hate speech is not permitted." |
| `social_blocked_illegal` | „Illegal content is not permitted." |
| `social_blocked_malware` | „This link points to a known malware site." |
| `social_blocked_shortener_unresolvable` | „Short link could not be verified — please enter the direct URL." |
| `social_blocked_via_shortener` | Template-String mit `{host}` Placeholder: „The short link resolves to {host}, which is not allowed." |
| `social_blocked_toast` | Error-Toast: „Please fix the highlighted social-media link." |

**RTL-Hinweis:** Die Meldungen werden unter dem jeweiligen Input gerendert (`mt-0.5 text-xs text-red-500`). Tailwind `rtl:` ist hier nicht zwingend — Text-Alignment folgt dem HTML-`dir`-Attribut auf `<html>`. Eingesetzt werden die bestehenden Mechanismen (siehe `isRTL` in `src/lib/lang.ts`). **Arabisch/Hebräisch** Strings müssen ohne harte LTR-Zeichenketten auskommen; Host-Namen im `{host}`-Placeholder werden via Unicode-Bidi-Isolation (`\u2068…\u2069`, FSI/PDI) eingebettet, damit Domains wie `onlyfans.com` nicht die Satzrichtung brechen.

### System-Admin (`src/lib/system-admin-translations.ts`)

| Key | Zweck |
|---|---|
| `nav_social_link_rules` | „Social-Link Rules" |
| `slr_title` | Seitentitel |
| `slr_new` | „Add rule" |
| `slr_host` | „Domain" |
| `slr_category` | „Category" |
| `slr_source` | „Source" |
| `slr_source_admin` | „Admin" |
| `slr_source_external` | „External list" |
| `slr_note` | „Note" |
| `slr_created_at` | „Created" |
| `slr_delete_confirm` | Bestätigungstext |
| `slr_cat_adult`, `slr_cat_gambling`, `slr_cat_hate`, `slr_cat_illegal`, `slr_cat_malware`, `slr_cat_custom` | Kategorie-Labels |
| `slr_host_placeholder` | „example.com (no scheme, no path)" |
| `slr_duplicate_error` | „This host is already in the list." |
| `slr_invalid_host` | „Please enter a valid host name." |
| `slr_readonly_external` | Hint: „External entries are managed by the daily import." |

---

## 6. Risks & Mitigations

| Risiko | Wirkung | Mitigation |
|---|---|---|
| **SSRF bei Shortener-Resolve** | Server-seitig — DNS/IP-Filter, siehe Backend-Architect. Frontend kein Einfluss. | Im Backend-Architect referenzieren; 01-design Kap. 6/7. |
| **False Positives** (legitime Domain in StevenBlack-Liste) | Shop-Owner kann legitimen Link nicht speichern. | System-Admin-UI erlaubt kein Override-Allowlist in Phase 1 (out-of-scope). **Workaround:** Admin löscht/deaktiviert den Eintrag über System-Admin-Seite. → Backlog: Allowlist-Kategorie in Phase 2 erwähnen. |
| **Mehrere blockierte Links in einem Save** | User muss mehrfach speichern, weil Backend nur den ersten Verstoß meldet. | Frontend-State ist bereits Multi-Error-fähig. Issue an Backend: Antwort auf Multi-Error erweiterbar lassen. |
| **Clean-Boundary-Verletzung** | Shop-Admin importiert `SocialLinkBlockedError` aus ui/-Komponente — aber: Typ lebt in `src/types/shop-admin.ts`, nicht in `src/types/api.ts`. Korrekt. `ui/SocialLinksEditor` bleibt shared-UI (keine Shop-Admin-Imports darin). | Coder: **keinen** Import aus `shop-admin-translations.ts` in `ui/SocialLinksEditor` einbauen. Übersetzungen werden weiterhin als Props vom Aufrufer durchgereicht (neuer Prop `errorLabels?: Record<SocialLinkBlockCategory, string>` + `errorViaShortenerTemplate?: string`). |
| **RTL-Layout bricht** bei langen Fehlermeldungen in `ar`/`he` | Text umbricht ggf. im flex-row-Layout | Fehler-Paragraph hat `break-words` + `text-xs`. In RTL-Sprachen sind Error-Zeilen unter-dem-Feld, dir-sensitiv via `<html dir="rtl">`. Visual Test durch e2e-tester. |
| **Race Condition:** User tippt, Server-Error löscht sich, User sendet erneut den gleichen Link → zweites 422 | Funktional ok, aber UX nicht ideal | Optimistic-Clear (§4.3) ist akzeptabel; Server-Error wird neu gesetzt. |
| **Breaking Change** bestehender `SocialLinksEditor`-Konsumenten | Andere Aufrufer (z.B. Brand-Admin in Zukunft) könnten keine Error-Props setzen | Neue Props sind **optional**. Bestehende Aufrufe bleiben kompatibel. |
| **Admin-Navigation**-Datei unbekannt | Coder muss Nav-File im System-Admin-Bereich verifizieren | T8 hat expliziten Verify-Schritt. |

---

## 7. Task Breakdown

Jede Task ist so geschnitten, dass sie als eine fokussierte Coder-Session abgeschlossen werden kann.

### Phase A — Typen & Übersetzungen (keine Abhängigkeiten untereinander)

**T1 — Shop-Admin-Typen ergänzen**
Datei: `src/types/shop-admin.ts`
Ergänze `SocialLinkBlockCategory`, `SocialLinkBlockedError`, `SocialLinkFieldError` (§2).
*Deps:* keine.

**T2 — System-Admin-Typen ergänzen**
Datei: `src/types/system-admin.ts`
Ergänze `SocialLinkRuleCategory`, `SocialLinkRuleSource`, `SysAdminSocialLinkRule`, `SysAdminSocialLinkRuleCreate`.
*Deps:* keine.

**T3 — Shop-Admin-Translations**
Datei: `src/lib/shop-admin-translations.ts`
Neue Keys aus §5 in allen sechs Sprachen. FSI/PDI-Embedding für `{host}`-Template in `ar`/`he`.
*Deps:* keine.

**T4 — System-Admin-Translations**
Datei: `src/lib/system-admin-translations.ts`
Neue Keys aus §5 in allen sechs Sprachen.
*Deps:* keine.

### Phase B — Shop-Admin Editor-Erweiterung

**T5 — `ui/SocialLinksEditor` um Server-Error-Props erweitern**
Datei: `src/components/ui/SocialLinksEditor.tsx`
- Neue optionale Props: `serverErrors?: Record<string, SocialLinkFieldError>`, `errorLabels?: Record<SocialLinkBlockCategory, string>`, `errorViaShortenerTemplate?: string`, `onServerErrorDismiss?: (key: string) => void`.
- Rendert zusätzliche rote Fehlerzeile unter Feld, wenn `serverErrors[key]` gesetzt.
- `onChange` eines Feldes mit Server-Error triggert `onServerErrorDismiss(key)`.
- Keine Imports aus Shop-Admin oder Customer-Code (Clean Boundary).
*Deps:* T1, T3.

**T6 — `ProfileForm` integriert Server-Error-Handling**
Datei: `src/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm.tsx`
- `serverErrors` State (`Record<string, SocialLinkFieldError>`).
- Save-Handler parst 422, mapped auf State.
- Übergibt `errorLabels` (Lookup auf `tr.social_blocked_*`) und `errorViaShortenerTemplate` an `SocialLinksEditor`.
- Zeigt Toast `tr.social_blocked_toast` bei 422.
- Setzt `serverErrors[key]` zurück via `onServerErrorDismiss`.
*Deps:* T1, T3, T5.

### Phase C — System-Admin CRUD

**T7 — `system-admin-api` erweitern**
Datei: `src/lib/system-admin-api.ts`
- `getSocialLinkRules(params)` → `PaginatedResponse<SysAdminSocialLinkRule>`.
- `getSocialLinkRuleCategories()` → `{ categories: SocialLinkRuleCategory[] }` (optional, Konstante im Frontend reicht alternativ).
*Deps:* T2.

**T8 — System-Admin-Navigation**
Datei: AdminNav-Component (Coder muss Pfad verifizieren — vermutlich `src/components/admin/AdminNav.tsx` oder `src/app/(system-admin)/admin/(portal)/layout.tsx`).
Eintrag `nav_social_link_rules` → Link `/admin/social-link-rules`.
*Deps:* T4.

**T9 — System-Admin-Liste**
Dateien:
- `src/app/(system-admin)/admin/(portal)/social-link-rules/page.tsx` (server component, holt initial die ersten 50 Einträge, rendert `RuleList`).
- `src/app/(system-admin)/admin/(portal)/social-link-rules/RuleList.tsx` (client component, Tabelle + Delete-Button + Such-/Filterzeile).
Delete über `fetch('/api/admin/social-link-rules/{id}', { method: 'DELETE' })`.
*Deps:* T2, T4, T7.

**T10 — System-Admin-Neu-Formular**
Dateien:
- `src/app/(system-admin)/admin/(portal)/social-link-rules/new/page.tsx`
- `src/app/(system-admin)/admin/(portal)/social-link-rules/RuleForm.tsx`
Host-Input, Kategorie-Select, Notiz-Textarea, Submit → POST, Redirect zu Liste bei Erfolg. Duplicate-Error (409) inline.
*Deps:* T2, T4, T7.

### Phase D — Tests

**T11 — Vitest-Unit-Test für SocialLinksEditor**
Datei: `src/tests/SocialLinksEditor.test.tsx` (neu oder ergänzen falls vorhanden)
- Server-Errors werden unter dem korrekten Feld gerendert.
- `onServerErrorDismiss` feuert beim Editieren des Feldes.
- `via_shortener`-Template wird mit `{host}` korrekt ersetzt.
*Deps:* T5.

**T12 — Vitest-Test für ProfileForm-Mapping**
Datei: `src/tests/ProfileForm.test.tsx` (neu oder ergänzen)
- Mock `fetch` mit 422-Response → `SocialLinksEditor` erhält `serverErrors[key]`.
- Erfolgs-Save löscht Server-Errors.
*Deps:* T6.

### Abhängigkeits-Graph

```
T1 ──► T5 ──► T6 ──► T11
T3 ──► T5          T12
T2 ──► T7 ──► T9
                  T10
T4 ──► T8
       T9
       T10
```

Phase A (T1–T4) kann parallel laufen.
T5 benötigt T1+T3. T6 benötigt T5.
T9/T10 benötigen T7+T4+T2.
T11/T12 zum Schluss.

---

## Handoff

Architecture complete at `specs/2026-04-24-social-link-moderation/02-architecture.md`. Ready for coder.
