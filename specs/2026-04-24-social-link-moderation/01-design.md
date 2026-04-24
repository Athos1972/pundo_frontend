# Social-Link-Moderation (Anti-Adult / Anti-NSFW)

**Feature-Slug:** `2026-04-24-social-link-moderation`
**Datum:** 2026-04-24

---

## 1. Problem & Nutzer

Shop-Owner können im Shop-Profil neben den sechs Fix-Plattformen (Facebook, Instagram, TikTok, YouTube, LinkedIn, X) über das „Sonstiges"-Feld einen **frei wählbaren Social-Link** (Key + URL) hinterlegen. Gedacht war das für berufliche Netzwerke wie Xing oder LinkedIn-Alternativen. Es gibt aber aktuell **keine inhaltliche Prüfung** der URL — ein Shop-Owner kann dort `onlyfans.com/xxx`, `pornhub.com/...` oder jede andere NSFW-Seite verlinken. Das gefährdet die Marken-Integrität (pundo, naidivse, rusky) und kann je nach Markt rechtliche Folgen haben (Werberecht, Jugendschutz).

**Nutzer:**
- **Shop-Owner** (Eingeber, wird geblockt/gewarnt)
- **System-Admin** (sieht Verstöße, pflegt Regellisten, entscheidet Grenzfälle)
- **Endnutzer / Customer** (indirekt geschützt)

---

## 2. User Flows

### Happy Path — zulässiger Link (z.B. Xing)

1. Shop-Owner öffnet `Profil` → Social-Links-Editor.
2. Trägt im „Sonstiges"-Feld ein: Key=`xing`, URL=`https://xing.com/profile/...`.
3. Frontend validiert URL-Format (bereits vorhanden).
4. Beim Speichern prüft das **Backend** die Host-Domain gegen Blocklist → kein Treffer → ok.
5. Optional: für **nicht-gelistete, unbekannte** Hosts läuft ein **Unshorten+Re-Check** (TinyURL, bit.ly, t.co, is.gd, …) — Final-Host wird gegen Blocklist geprüft.
6. Link wird gespeichert, Editor zeigt Erfolg.

### Edge Case A — direkter NSFW-Domain-Treffer

1. Shop-Owner trägt `https://onlyfans.com/foo` ein.
2. Beim Speichern erkennt der Backend-Check `onlyfans.com` in der Blocklist (Kategorie `adult`).
3. Backend liefert `422` mit Fehler-Code `social_link_blocked` + Kategorie.
4. Frontend zeigt Fehler unter dem URL-Feld: „Diese Seite ist nicht erlaubt (Erwachseneninhalt)."
5. Speichern abgebrochen, restliche Profiländerungen bleiben erhalten (Inline-Fehler, kein Daten-Verlust).

### Edge Case B — Verstecken hinter URL-Shortener

1. Shop-Owner trägt `https://tinyurl.com/abc123` ein, Ziel = `pornhub.com/...`.
2. Backend erkennt Host als **Shortener** (eigene Liste bekannter Shortener).
3. Backend folgt HEAD/GET-Redirect bis zu N=5 Hops (Timeout 3s, max. 1 pro Link pro Save).
4. Final-Host (`pornhub.com`) wird gegen Blocklist geprüft → Treffer.
5. Gleiche Fehlermeldung wie A, ergänzt um Hinweis: „Der Kurzlink verweist auf eine nicht erlaubte Seite."

### Edge Case C — Shortener nicht auflösbar / Netz-Fehler

1. Shortener antwortet nicht / Timeout.
2. Default-Policy: **Shortener werden grundsätzlich abgelehnt**, wenn Auflösung fehlschlägt (fail-closed).
3. Fehlermeldung: „Kurzlink konnte nicht geprüft werden — bitte direkte URL angeben."

### Edge Case D — System-Admin pflegt Blocklist

1. System-Admin sieht in `admin` eine neue Seite `Social-Link-Regeln`.
2. Kann Einträge hinzufügen/entfernen: Domain + Kategorie (`adult`, `gambling`, `hate`, `illegal`, `custom`).
3. Änderung wirkt sofort auf alle zukünftigen Speicherungen.
4. **⚠️ ANNAHME:** Bestehende, bereits gespeicherte Links werden **nicht rückwirkend** entfernt — stattdessen beim nächsten Edit geprüft. (Alternative: Batch-Audit-Job — siehe Offene Fragen.)

---

## 3. Screen / Component Inventory

### Frontend

| Element | Art | Zweck |
|---|---|---|
| `SocialLinksEditor` (ui/) | geändert | Zeigt Inline-Fehler vom Backend unter URL-Feld; neuer Fehler-State `serverError` pro Key |
| `ProfileForm.tsx` (shop-admin) | geändert | Fängt `422 social_link_blocked` ab, mappt auf `SocialLinksEditor` |
| `shop-admin-api.ts` | geändert | Typ `SocialLinkBlockedError` (Key, Kategorie, Final-URL bei Shortener) |
| `shop-admin-translations.ts` | geändert | Neue Strings in allen 6 Sprachen (blocked-adult, blocked-gambling, blocked-hate, blocked-illegal, shortener-unresolvable, generic-blocked) |
| `admin/social-link-rules/page.tsx` (system-admin) | **neu** | CRUD für Blocklist-Einträge |
| `admin/social-link-rules/RuleForm.tsx` | **neu** | Eingabe: Domain + Kategorie + Notiz |
| `system-admin-api.ts` | geändert | Endpoints für Blocklist-CRUD |

### Backend (nur Anforderungen — Design macht Backend-Architect)

Siehe Abschnitt 4.

---

## 4. Backend-Anforderungen

⚠️ **Backend-Änderungen erforderlich — Architect muss Backend-Architect-Skill triggern.**

### Was das Backend leisten muss

1. **Blocklist-Check** bei jedem Shop-Save / Social-Link-Save:
   - Host-Extraktion aus URL (inkl. Subdomain-Normalisierung: `www.onlyfans.com` = `onlyfans.com`; auch `*.onlyfans.com`).
   - Lookup in zwei Quellen:
     - (a) **Externe, gepflegte Listen** (z.B. [StevenBlack/hosts "porn"-Kategorie](https://github.com/StevenBlack/hosts), [blocklistproject/lists](https://github.com/blocklistproject/lists), Shallalist). Einmal pro Tag per Cron-Worker importieren, in DB cachen.
     - (b) **Eigene Negativliste** (system-admin-pflegbar), überschreibt/ergänzt externe Listen.
2. **Shortener-Auflösung**:
   - Eigene, kleine Liste bekannter Shortener (tinyurl, bit.ly, t.co, is.gd, ow.ly, buff.ly, goo.gl, rb.gy, shorturl.at, cutt.ly, …).
   - Wenn Host in Shortener-Liste → HEAD-Request folgen, max. 5 Redirects, Timeout 3s, User-Agent gesetzt. Final-Host gegen Blocklist.
   - Fail-closed: kein Final-Host ermittelbar ⇒ Ablehnung mit Hinweis.
3. **Endpoints:**
   - `GET /admin/social-link-rules` — Liste (paginiert, nach Domain filterbar)
   - `POST /admin/social-link-rules` — neuer Eintrag (Domain, Kategorie, Notiz)
   - `DELETE /admin/social-link-rules/{id}`
   - `PATCH /admin/social-link-rules/{id}` (optional — Notiz/Kategorie)
   - `GET /admin/social-link-rules/categories` — Enum der unterstützten Kategorien
4. **Validierung im Shop-Update-Endpoint**: wenn Verstoß → `422` mit Payload:
   ```json
   { "error": "social_link_blocked",
     "key": "xing",
     "category": "adult",
     "resolved_host": "pornhub.com",
     "via_shortener": true }
   ```
5. **DB-Tabellen (neu):**
   - `social_link_blocklist` — (id, host, category, source [`external`/`admin`], note, created_at, external_batch_id)
   - `social_link_shortener_hosts` — (id, host, active)
6. **Worker/Cron:** täglicher Import externer Blocklisten, diff-basierend (alte `external`-Einträge ersetzen, Admin-Einträge unangetastet).

### Antwort auf User-Frage

- **Fertige Listen existieren** und sollten genutzt werden (StevenBlack/hosts hat Kategorie `porn` mit zehntausenden Domains, Shallalist, blocklistproject, URLhaus für Malware). Eigene Negativliste nur als **Override/Ergänzung** für Grenzfälle.
- **Shortener lassen sich** durch Redirect-Folgen auflösen — aber nicht 100%. Einige Shortener erlauben JS-Redirects, CAPTCHA-Gates oder Landing-Pages. Daher: Shortener-Hosts erkennen + auflösen + fail-closed bei Nicht-Auflösbarkeit.

---

## 5. Acceptance Criteria

1. **AC1 — Direkter Block:**
   **Given** ein Shop-Owner bearbeitet sein Profil
   **When** er im Sonstiges-Social-Link `https://onlyfans.com/x` einträgt und speichert
   **Then** zeigt das Formular einen Fehler unter dem URL-Feld, der die Kategorie nennt (z.B. „Erwachseneninhalt"), und der Shop wird **nicht gespeichert**.

2. **AC2 — Zulässiger Link wird gespeichert:**
   **Given** Shop-Owner trägt `https://xing.com/profile/foo` ein
   **When** er speichert
   **Then** Link wird akzeptiert und persistiert.

3. **AC3 — Shortener mit NSFW-Ziel:**
   **Given** Shop-Owner trägt einen `tinyurl.com`-Link ein, der auf `pornhub.com` umleitet
   **When** er speichert
   **Then** Backend löst den Shortener auf, Final-Host trifft die Blocklist, Speichern wird mit Fehlermeldung „Der Kurzlink verweist auf eine nicht erlaubte Seite" abgebrochen.

4. **AC4 — Unresolvbarer Shortener:**
   **Given** Shortener antwortet nicht (Timeout)
   **When** Shop-Owner speichert
   **Then** Speichern wird abgelehnt mit Meldung „Kurzlink konnte nicht geprüft werden".

5. **AC5 — Subdomain-Normalisierung:**
   **Given** `www.onlyfans.com/x` oder `m.onlyfans.com/x`
   **When** geprüft wird
   **Then** beide werden geblockt (alle Subdomains von `onlyfans.com`).

6. **AC6 — System-Admin CRUD:**
   **Given** System-Admin ist eingeloggt
   **When** er die neue Seite `Social-Link-Regeln` öffnet, einen Eintrag `badsite.example` / `adult` anlegt
   **Then** erscheint der Eintrag in der Liste, und ein neuer Shop-Profil-Save mit `badsite.example` wird geblockt.

7. **AC7 — Nur Sonstiges-Feld wird geprüft? — siehe Offene Fragen.**
   ⚠️ ANNAHME für Implementierung: **Alle** Social-Links werden geprüft (auch die sechs Fix-Plattformen), weil Facebook-Seiten auf adult-Inhalte verweisen können. Die Domains `facebook.com`, `instagram.com` etc. sind per se nicht blockiert, aber Pfade werden **nicht** geprüft.

8. **AC8 — Übersetzungen:**
   Alle Fehlermeldungen sind in allen 6 Sprachen (en/de/el/ru/ar/he) vorhanden; RTL-Rendering ist korrekt.

9. **AC9 — Performance:**
   Shortener-Check hat harten Timeout 3s, blockiert Save-Request nicht länger als 5s gesamt (auch bei mehreren Links).

10. **AC10 — Kein Rückwirkungs-Delete:**
    Bereits gespeicherte Links bleiben bestehen, werden aber beim nächsten Edit des Profils gegen die aktuelle Liste geprüft.

---

## 6. Open Questions / Entscheidungen

- ❓ **OFFEN 1:** Sollen Fix-Plattformen (Facebook/Instagram/etc.) ebenfalls gegen Blocklist geprüft werden, oder nur das „Sonstiges"-Feld? **Empfehlung:** Host-Check für alle sechs, da Fixed-Plattformen in der Blocklist nicht auftauchen werden → Kosten null, Sicherheit höher. Ohne Pfad-Inspektion (siehe OFFEN 2).

BB/24.4.: Ja, auch die anderen Links muss man checken bitte!

- ❓ **OFFEN 2:** Pfad-/Username-Check? (z.B. `facebook.com/XYZ-Adult-Page`) → wahrscheinlich aus Scope raus, da nicht zuverlässig ohne Content-Scan. **Empfehlung:** Nein, aus Scope.

BB/24.4.: Out-of-Scope

- ❓ **OFFEN 3:** Rückwirkende Prüfung bestehender Shops? Batch-Job, der Alt-Daten auditiert und System-Admin-Inbox anlegt? **Empfehlung:** Phase 2.

BB/24.4.: Nein

- ❓ **OFFEN 4:** Welche Kategorien genau? Minimal: `adult`. Erweitert: `gambling`, `hate`, `illegal`, `malware`. **Empfehlung:** Start mit `adult` + `malware` (URLhaus), Rest später.

BB/24.4.: adult, gamling, hate, illegal, malware. 

- ❓ **OFFEN 5:** Soll `publicsuffix`-Liste für Subdomain-Normalisierung verwendet werden (wegen `xxx.co.uk` etc.)? **Empfehlung:** Ja, Standard-Library in Backend.

BB/24.4.: Alles, was wir gratis und performant machen können - ja.

- ❓ **OFFEN 6:** Admin-UI für Audit-Log (welcher Shop hat versucht, was zu speichern)? **Empfehlung:** Phase 2, aber Backend sollte Versuche loggen (nur Count + Domain, keine PII).

BB/24.4.: Ja, wär fein. Für Phase 1 reicht Backend-Logging

- ❓ **OFFEN 7:** Shortener-Resolve serverseitig — SSRF-Risiko? Muss durch Allowlist öffentlicher IPs / DNS-Check abgesichert werden (keine Requests an `127.0.0.1`, `10.*`, `169.254.*`). **Empfehlung:** Zwingend im Backend-Architect zu adressieren.

BB/24.4.: Ja.

- ❓ **OFFEN 8:** Welche externe Blockliste als Primary? Empfehlung: StevenBlack/hosts (MIT, tägliche Updates, klare Kategorien) + URLhaus für Malware.

BB/24.4.: Gerne StevenBlack und UrlHaus und Anweisung für Serverbetrieb für regelmäßiges Update. Ich gehe davon aus, dass wir das lokal puffern können und nicht immer online fragen müssen?

---

Design complete at `specs/2026-04-24-social-link-moderation/01-design.md`. Ready for /architect.
