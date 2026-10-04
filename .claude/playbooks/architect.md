# Playbook architect — pundo_frontend

Gelesen vom Agent `architect` (~/.claude/agents/architect.md). Kettenprotokoll und Workflow-Regeln stehen dort und in Conventions § Spec-Workflow; hier steht nur Repo-Wissen.

Alles hier bezieht sich auf dieses Repo — keine generischen Empfehlungen.

---

## Systemüberblick

### Zweck
Price- und Produktlocator-App: Findet Produkte und lokale Dienstleistungen in der
Nähe des Nutzers. Das Frontend ist die User-facing Next.js-App; das Backend
(`pundo_main_backend`) liefert alle Daten via REST-API.

### Designprinzipien
- **Mobile-first:** Die App wird primär auf Mobilgeräten genutzt — Breakpoints und Touch-Interaktion zuerst
- **Mehrsprachig von Anfang an:** EN, DE, EL, RU, AR, HE — RTL (AR, HE) erfordert explizite `dir="rtl"`-Behandlung
- **Server Components by default:** Nur was Interaktivität/Browser-APIs braucht, wird Client Component
- **API-Proxy:** Kein direkter Backend-Zugriff vom Browser — alles via `/api/v1/` Next.js-Rewrite
- **Lean Typen:** TypeScript-Interfaces in `src/types/api.ts` spiegeln Backend-Schema; kein Over-Engineering
- **Backend als Quelle der Wahrheit:** Kategorien und übersetzte Inhalte kommen vom Backend. RTL dagegen über `isRTL()` aus `src/lib/lang.ts` — keine eigenen Sprachlisten
- **Restart-Regel:** Test-Instanzen (Frontend 3500 / Backend 8500) dürfen automatisch neu gestartet werden. Produktiv-Instanzen (3000 / 8000) startet nur der User manuell oder auf ausdrückliche Aufforderung neu, weil dort Echtdaten und laufende Nutzer hängen.

---

## Dokumentation: Vault vs. /docs

**Faustregel:** „Warum so entschieden?" → Vault. „Wie führe ich X aus?" → `/docs` im Repo.

| Inhalt | Wo | Regel |
|---|---|---|
| Feature-Specs (01–04-*.md) | **Vault** (Pfade: siehe Agent / Conventions) | designer/architect/coder/e2e-tester schreiben hierhin |
| Feature-Docs (FGn/_index.md, Feature.md) | **Vault** | Architektur-Entscheidungen, Trade-offs, Geschichte, Cross-Repo-Kontext |
| Bug-Dateien, Journey-Catalog | **Vault** | e2e-tester führt Register |
| Ports, Test-Befehle, Env-Vars | **`/docs` im Repo** | Muss im selben PR wie Codeänderungen aktualisiert werden |
| API-Referenz (Endpoints, Felder) | **`/docs` im Repo** | Nah am Code, von CI/Agenten lesbar |
| Komponenten-Struktur, Route-Übersicht | **`/docs` im Repo** | `architecture.md` — wird mit dem Code gepflegt |
| E2E-Setup, wie Tests ausführen | **`/docs` im Repo** | `e2e-testing.md` — Ports/Befehle hier, nie im Vault |

Ports und Test-Befehle gehören in `/docs` statt nur in den Vault — im Vault veralten sie sofort und stehen dem Operator nicht zur Verfügung. Architektur-Entscheidungen und Feature-Geschichte gehören in den Vault statt nur in `/docs`, weil sie dort mit Specs und Bug-Kontext verknüpft sind.

Wenn du `02-architecture.md` schreibst und dabei Ports, Befehle oder Komponentenstruktur änderst: trag den `docs/architecture.md`-Update als Task in die Task-Liste von `02-architecture.md` ein, damit der Coder ihn im selben PR erledigt.

---

## Modulstruktur

Kein Baum im Playbook (veraltet zu schnell) — lies den echten Code und `docs/architecture.md` (Abschnitte „Route-Gruppen“, „Modulstruktur“).

Orientierung:
- Route-Groups unter `src/app/`: `(customer)/[lang]/…` (öffentliche Seiten mit `/{lang}/`-Präfix, z. B. `products/[slug]`, `shops/[slug]`, `search`, `guides`, `blog`), `(customer)/account`, `(customer)/auth`, `(shop-admin)/shop-admin`, `(system-admin)/admin`, `(oauth)`, `crm`, `api`
- Komponenten: `src/components/<domäne>/` — Bestand per `ls src/components` prüfen
- Weitere Repo-Docs: `docs/i18n.md`, `docs/seo.md`, `docs/search.md`, `docs/data-model.md`, `docs/e2e-testing.md`, `docs/shop-owner-portal.md`

---

## Backend-Integration

### API-Proxy (next.config.ts)
```
Browser → /api/v1/:path*  →  http://localhost:8500/api/v1/:path*
Browser → /brand_logos/:path*  →  http://localhost:8500/brand_logos/:path*
```

- **BACKEND_URL** in `.env.local` konfigurierbar (Studio-Default: `http://localhost:8500`)
- Kein CORS-Problem, da alles durch Next.js proxied wird
- Alle Backend-API-Typen in `src/types/api.ts` spiegeln

### Backend-Repo
Falls eine Anforderung Backend-Änderungen erfordert:
- **Pfad:** `/Users/bb_studio_2025/dev/github/pundo_main_backend`
- **Backend-Playbooks:** `/Users/bb_studio_2025/dev/github/pundo_main_backend/.claude/playbooks/`
- Immer explizit kommunizieren: „Für dieses Feature braucht es Backend-Änderungen: [was genau]"

### Backend-Bedarf: Marker statt Selbststart

Marker-Format und Ablauf: siehe Agent (Abschnitt „Cross-repo needs“) und Conventions § Spec-Workflow.

**Erkennungsmerkmale für Backend-Änderungen** (mindestens eines trifft zu):
- Neue API-Endpoints nötig
- DB-Schema ändert sich (neue Tabellen, Spalten, Constraints)
- Bestehende Endpoints ändern ihre Payload-Shape
- Background-Worker müssen umgebaut werden
- Alembic-Migration nötig

---

## Datenpfade & Datenfluss

### Typischer Seitenaufruf (Server Component)
```
Browser
  ↓ HTTP GET /de/search?q=Katzenfutter
  Next.js Server
  ↓ fetch('/api/v1/products?q=Katzenfutter')  [server-side]
  Backend (pundo_main_backend, :8500 Studio / :8000 Hetzner)
  ↓ JSON Response
  React Server Component → HTML streamen
  Browser (hydration minimal)
```

### Interaktive Komponenten (Client Component)
```
SearchBar, FilterChips, CategoryChips, ShopMap, LanguageSwitcher
  → 'use client'
  → Browser-State, Event-Handler, URL-Params via useSearchParams/useRouter
```

### Mehrsprachigkeit & RTL
```
LanguageSwitcher → setzt Cookie app_lang + /{lang}/-Pfad
src/app/(customer)/layout.tsx → setzt <html lang={lang} dir={dir}>
RTL → isRTL(lang) aus src/lib/lang.ts (RTL_LANGS = ar, he)
       Keine eigenen Sprachlisten im Code
Tailwind RTL: rtl: prefix für spiegelbare Layouts
```

---

## Server vs. Client Components — Entscheidungsmatrix

| Situation | Entscheidung | Begründung |
|---|---|---|
| Datenabruf von Backend | **Server Component** | Kein Client-Bundle, SEO, kein Waterfall |
| Suchformular mit onChange | **Client Component** | Browser-Events |
| Leaflet-Karte | **Client Component** (`dynamic import, ssr: false`) | Leaflet läuft nur im Browser |
| Statische Texte / UI-Shell | **Server Component** | Kein Overhead |
| URL-Params lesen/schreiben | **Client Component** | `useSearchParams` nur im Browser |
| Loading-Skeleton | **Server Component** oder `loading.tsx` | Streamed vor Content |
| LanguageSwitcher | **Client Component** | Cookie/State-Mutation |

**Faustregel:** Fange immer als Server Component an. Wechsle zu Client Component nur wenn notwendig.

---

## Routing-Architektur (Next.js App Router)

### Existierende Routen
Siehe `ls src/app/(customer)/[lang]` und `docs/architecture.md` („Route-Gruppen“). Keine Routentabelle im Playbook pflegen.

### Neue Routen hinzufügen
1. Ordner in der passenden Route-Group anlegen — Customer-Pages unter `src/app/(customer)/[lang]/` (Links via `localePath()`)
2. `page.tsx` (Server Component by default, SEO-Checkliste `docs/seo.md`)
3. `loading.tsx` für Streaming-Skeleton
4. `error.tsx` falls spezifischer Error-State nötig
5. Typen in `src/types/api.ts` ergänzen falls neue API-Daten

---

## Mehrsprachigkeit & RTL-Architektur

### Sprachcodes
`en`, `de`, `el` (Griechisch), `ru` (Russisch), `ar` (Arabisch), `he` (Hebräisch)

### RTL-Behandlung
- RTL über `isRTL()` aus `src/lib/lang.ts` — keine eigenen Sprachlisten, nicht aus API-Feldern ableiten
- Layout `src/app/(customer)/layout.tsx`: `<html lang={lang} dir={dir}>`
- Tailwind: `rtl:` Modifier für gespiegelte Layouts (`rtl:text-right`, `rtl:flex-row-reverse`)
- Test: AR und HE Sprachen müssen `dir="rtl"` auslösen; EN/DE/EL/RU nicht

### Übersetzungen
- `src/lib/translations.ts` — statische UI-Strings, kein externes i18n-Framework
- Dynamische Inhalte (Kategorienamen, Produkttitel) kommen übersetzt vom Backend

---

## Performance-Architektur

### Bilder
- `next/image` für alle Produktbilder (automatische Optimierung, lazy loading)
- `ProductImage.tsx` als Wrapper — behandelt missing/broken Images mit Fallback
- Brand-Logos via `/brand_logos/` Proxy (kein externer Fetch im Browser)

### Maps
- `ShopMap.tsx` mit `dynamic(() => import('./ShopMapClient'), { ssr: false })`
- Leaflet-Bundle nur laden wenn Map sichtbar — kein SSR overhead

### Datenabruf
- Server Components fetchen direkt — kein `useEffect` + loading state für initiale Daten
- `loading.tsx` / Suspense für streaming Skeletons
- SWR oder React Query nur wenn wirklich clientseitiges Refetching nötig

---

## Erweiterungspunkte

### Neue Seite/Route
1. Ordner in `src/app/(customer)/[lang]/` (bzw. passende Route-Group) + `page.tsx` + `loading.tsx`
2. API-Call in `src/lib/api.ts` ergänzen
3. TypeScript-Interface in `src/types/api.ts`
4. Komponenten in passendem `src/components/`-Unterordner

### Neue Komponente
1. Ordner-Zuordnung nach Domäne: `product/`, `search/`, `shop/`, `map/`, `ui/`
2. Server Component by default, `'use client'` nur wenn nötig
3. Props-Interface direkt in der Datei oder in `src/types/api.ts`

### Neue Sprache
1. Sprachcode in `src/lib/lang.ts` (inkl. `RTL_LANGS`, falls RTL) und `src/lib/translations.ts` ergänzen
2. Backend-Team informieren (neue Übersetzungs-Batch nötig)

### Backend-Endpunkt nutzen (neuer)
1. Interface in `src/types/api.ts`
2. Fetch-Funktion in `src/lib/api.ts`
3. Server Component oder API Route Handler

---

## Journey-Deltas (Katalog-Validierung)

**Dieser Abschnitt ist bei JEDEM Architektur-Spec verpflichtend.** Er kommt nach dem normalen Architekturabschnitt, vor der Task-Liste.

### Schritt-für-Schritt

1. **Lies** `e2e/journeys/CATALOG.md`. Filtere Einträge, deren `touches-modules` sich mit den in §1 dieses Architektur-Specs genannten Modulen schneiden.

2. **Validiere** jeden vom Designer als `proposed` markierten Journey-Eintrag zu diesem Spec:
   - Stimmt jeder `touches-modules`-Glob mit der realen Modulstruktur überein? (`ls`-Check auf den ersten nicht-Wildcard-Teil des Globs)
   - Wenn nicht: Korrektur im Vorschlag formulieren.

3. **Drift-Check** auf bestehenden Einträgen (AC-9):
   - Für jeden Glob: `ls`-Check auf den statischen Präfix (vor `/**` oder `[param]`).
   - Bei fehlendem Pfad: `"Stale touches-modules in <journey-id>: <glob> existiert nicht mehr"` + Fix-Vorschlag.
   - Stale Einträge zählen konservativ als "muss laufen" bis der Fix bestätigt ist.

4. **Eigene Vorschläge:** Nur Drift-Korrekturen und Validierung, keine neuen Architekt-Heuristiken.

5. **Schreibe Abschnitt "Journey-Deltas"** in `02-architecture.md` mit:
   - (a) Validierte Designer-Vorschläge (korrekt / mit Korrekturbedarf)
   - (b) Drift-Fixes (falls vorhanden)

6. CATALOG.md nicht selbst ändern. Die Deltas als `proposed` im Abschnitt „Journey-Deltas“ festhalten und unter „Entscheidungen für Bernhard“ bündeln.

### Was der Architect nicht darf

- `status: implemented` setzt ausschließlich der Coder.
- `last-run` / `last-result` ändert ausschließlich der e2e-tester.
- Katalog-Einträge änderst du nur nach Bernhards Freigabe; bis dahin stehen Änderungen als Vorschlag im Spec.
- **Darf** primär `touches-modules`-Korrekturen vorschlagen (Drift-Fix, umgesetzt nach Freigabe).

---

## Bekannte Trade-offs & Architektur-Entscheidungen

| Entscheidung | Begründung | Alternative wenn... |
|---|---|---|
| App Router (nicht Pages Router) | Streaming, Server Components, verschachtelte Layouts | Bei Migration von altem Code: Pages Router |
| Kein i18n-Framework | Wenige statische Strings, Backend liefert übersetzte Inhalte | Bei vielen UI-Strings: next-intl |
| Eigener Fetch in `api.ts` | Kein Extra-Dependency, volle Kontrolle | Bei komplexem Caching: React Query/SWR |
| Tailwind CSS 4 | Utility-first, kein CSS-in-JS Overhead | Bei komplexen Design-Token: CSS Variables |
| Leaflet statt Google Maps | Open Source, keine API-Key-Pflicht | Bei Navigation/Routing: Google Maps |
| Standalone Output | Docker-freundlich (`output: 'standalone'`) | Bei serverless: Vercel/Netlify Adapter |

---

## Architektur-Leitfragen (vor jeder Entscheidung)

1. **Server oder Client?** Braucht die Komponente Browser-APIs oder Interaktivität?
2. **RTL vollständig?** Wird `dir="rtl"` für AR und HE korrekt gesetzt?
3. **API-Proxy korrekt?** Läuft alles über `/api/v1/` und nicht direkt zum Backend?
4. **Typen aktuell?** Spiegelt `src/types/api.ts` das Backend-Schema?
5. **Backend-Änderung nötig?** Wenn ja: explizit benennen und als Marker „Backend-Anforderungen“ in `02-architecture.md` setzen
6. **MVP-Scope:** Braucht der MVP (Pet-Kategorie) das wirklich, oder ist es für später?
7. **Shop-Admin Clean Boundary:** Alles unter `shop-admin/` muss isoliert bleiben — keine Imports aus customer-facing Code (außer `src/components/ui/`). Shop-Admin-spezifische Typen → `src/types/shop-admin.ts`. API-Client → `src/lib/shop-admin-api.ts`. Translations → eigener Namespace. Bei jedem Komponentendesign prüfen: Könnte man diese Datei in ein separates Repo verschieben, ohne etwas aus dem Customer-Frontend mitziehen zu müssen? Wenn Nein → Architektur anpassen.

---

## Antwortformat für Architektur-Entscheidungen

**Kontext:** Was ist die Ausgangslage? Welches Problem wird gelöst?
**Optionen:** 2–3 konkrete Alternativen mit Trade-offs
**Empfehlung:** Welche Option und warum — bezogen auf dieses System
**Auswirkungen:** Welche Komponenten/Routen/Typen sind betroffen?
**Backend-Abhängigkeit:** Ja / Nein — wenn ja, was genau?
**Nächster Schritt:** Erste konkrete Aktion (Datei, Komponente, Interface, Config-Key)
