# Backend-Architektur: Social-Link-Moderation

**Feature-Slug:** `2026-04-24-social-link-moderation`
**Datum:** 2026-04-24
**Autor:** Backend-Architect
**Eingabe:** `01-design.md` (BB-Entscheidungen vom 24.4. inkl.)

---

## 1. DB-Schema

### 1.1 Tabelle `social_link_blocklist`

```sql
CREATE TABLE social_link_blocklist (
    id              SERIAL PRIMARY KEY,
    host            VARCHAR(253) NOT NULL,
    category        VARCHAR(32)  NOT NULL,   -- adult|gambling|hate|illegal|malware
    source          VARCHAR(16)  NOT NULL,   -- 'external' | 'admin'
    note            TEXT,
    external_list   VARCHAR(64),             -- z.B. 'stevenblack_porn', 'urlhaus_malware'
    external_batch  VARCHAR(40),             -- SHA-1 des Import-Runs (für Diff)
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Primäre Suche: exakter Host-Lookup
CREATE UNIQUE INDEX uq_blocklist_host_source
    ON social_link_blocklist (host, source);

-- Für Admin-CRUD (Filter nach Kategorie, Paginierung)
CREATE INDEX ix_blocklist_category ON social_link_blocklist (category);
CREATE INDEX ix_blocklist_source   ON social_link_blocklist (source);

-- Für schnelles Wildcard-Match (Prefix-Scan: "onlyfans.com" im Host)
CREATE INDEX ix_blocklist_host_text ON social_link_blocklist (host text_pattern_ops);
```

**Constraints / Regeln:**
- `host` speichert immer den registrierbaren Apex-Host (ohne `www.`, ohne Protokoll, lowercase).
  Beispiel: `onlyfans.com`, nicht `www.onlyfans.com` oder `https://onlyfans.com`.
- `category` ist ein CHECK-Constraint auf die fünf Werte (siehe Migration).
- `source = 'admin'` — admin-pflegbar, niemals durch Cron überschrieben.
- `source = 'external'` — ausschließlich durch Cron geschrieben; bei Import-Diff gelöscht/ersetzt.
- `external_list` identifiziert die Quellliste (Enum-artig, aber als VARCHAR zur Erweiterbarkeit).
- `external_batch` = SHA-1 der heruntergeladenen Datei des letzten erfolgreichen Imports (für idempotenten Diff).

---

### 1.2 Tabelle `social_link_shortener_hosts`

```sql
CREATE TABLE social_link_shortener_hosts (
    id         SERIAL PRIMARY KEY,
    host       VARCHAR(253) NOT NULL UNIQUE,
    active     BOOLEAN      NOT NULL DEFAULT true,
    note       TEXT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_shortener_host ON social_link_shortener_hosts (host) WHERE active = true;
```

**Vorbestückt (Seed, T1):**

```
bit.ly, tinyurl.com, t.co, is.gd, ow.ly, buff.ly, rb.gy,
shorturl.at, cutt.ly, goo.gl, tiny.cc, short.io, bl.ink,
rebrand.ly, snip.ly, clck.ru, qr.ae, s.id, v.gd, mcaf.ee
```

Diese Tabelle wird ausschließlich manuell / per Admin-Seed gepflegt, kein Cron-Import.

---

### 1.3 Migration

**Revisions-ID:** `l5f6a7b8c9d0` (folgt auf `k4e5f6a7b8c9`)

```python
# ingestor/db/migrations/versions/l5f6a7b8c9d0_social_link_moderation.py

revision = "l5f6a7b8c9d0"
down_revision = "k4e5f6a7b8c9"

CATEGORIES = ("adult", "gambling", "hate", "illegal", "malware")

SHORTENER_SEED = [
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "ow.ly", "buff.ly",
    "rb.gy", "shorturl.at", "cutt.ly", "goo.gl", "tiny.cc", "short.io",
    "bl.ink", "rebrand.ly", "snip.ly", "clck.ru", "qr.ae", "s.id",
    "v.gd", "mcaf.ee",
]

def upgrade():
    op.execute(f"""
        CREATE TABLE social_link_blocklist (
            id            SERIAL PRIMARY KEY,
            host          VARCHAR(253) NOT NULL,
            category      VARCHAR(32)  NOT NULL
                          CHECK (category IN {CATEGORIES}),
            source        VARCHAR(16)  NOT NULL
                          CHECK (source IN ('external', 'admin')),
            note          TEXT,
            external_list VARCHAR(64),
            external_batch VARCHAR(40),
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE UNIQUE INDEX uq_blocklist_host_source ON social_link_blocklist (host, source)")
    op.execute("CREATE INDEX ix_blocklist_category ON social_link_blocklist (category)")
    op.execute("CREATE INDEX ix_blocklist_source   ON social_link_blocklist (source)")
    op.execute("CREATE INDEX ix_blocklist_host_text ON social_link_blocklist (host text_pattern_ops)")

    op.execute("""
        CREATE TABLE social_link_shortener_hosts (
            id         SERIAL PRIMARY KEY,
            host       VARCHAR(253) NOT NULL UNIQUE,
            active     BOOLEAN NOT NULL DEFAULT true,
            note       TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_shortener_host ON social_link_shortener_hosts (host) WHERE active = true")

    # Seed shortener list
    for h in SHORTENER_SEED:
        op.execute(f"INSERT INTO social_link_shortener_hosts (host) VALUES ('{h}')")


def downgrade():
    op.execute("DROP TABLE IF EXISTS social_link_blocklist")
    op.execute("DROP TABLE IF EXISTS social_link_shortener_hosts")
```

---

## 2. Service-Layer

Alle Services liegen in `ingestor/lib/social_link_moderation.py`.

### 2.1 Host-Normalisierung (`normalize_host`)

```
Input:  beliebige URL-Zeichenkette
Output: registrierbarer Apex-Host (str) | None bei Fehler

Algorithmus:
1. urllib.parse.urlparse(url)  → scheme + netloc
2. netloc.lower().lstrip("www.")
3. Public-Suffix-Library (tldextract, pypi: tldextract>=5.1) →
       domain + suffix  →  apex = f"{domain}.{suffix}"
   Beispiele:
     www.onlyfans.com    → onlyfans.com
     m.onlyfans.com      → onlyfans.com
     shop.example.co.uk  → example.co.uk
     localhost           → None (kein TLD) → Ablehnung
     192.168.1.1         → None (IP) → Ablehnung
4. Gibt None zurück bei:
   - kein gültiges Schema (http/https)
   - leerer domain- oder suffix-Teil
   - IP-Adresse (IPv4 + IPv6)
```

**Dependency:** `tldextract>=5.1` muss in `pyproject.toml` ergänzt werden.

---

### 2.2 Blocklist-Lookup (`check_host_blocked`)

```
Input:  apex_host (str), db Session
Output: BlocklistHit(host, category, source) | None

Algorithmus:
1. SELECT id, host, category, source
   FROM social_link_blocklist
   WHERE host = :apex_host
   ORDER BY source = 'admin' DESC  -- admin-Einträge zuerst
   LIMIT 1

   → Direkt-Treffer: gibt BlocklistHit zurück.

2. Falls kein Treffer: kein Subdomain-Walk nötig,
   da normalize_host bereits den Apex-Host liefert.
   (Subdomain-Match ist strukturell durch Normalisierung erledigt.)
```

**Performance:** Der unique Index `uq_blocklist_host_source` macht den Lookup zu einem O(log n)-B-Tree-Scan. Bei ~60.000 StevenBlack-Einträgen < 1 ms.

---

### 2.3 Shortener-Erkennung (`is_shortener_host`)

```
Input:  apex_host (str), db Session (oder In-Memory-Cache)
Output: bool

SELECT EXISTS(
    SELECT 1 FROM social_link_shortener_hosts
    WHERE host = :apex_host AND active = true
)
```

**Cache-Strategie:** Die Shortener-Liste ist klein (~20 Einträge) und selten verändert. Ein einfaches Modul-Level-Set (`_SHORTENER_CACHE: set[str]`) wird beim ersten Aufruf aus der DB geladen und nach 5 Minuten invalidiert (via `time.monotonic()`). Kein Redis nötig.

---

### 2.4 Shortener-Auflösung (`resolve_shortener`) — SSRF-geschützt

```
Input:  url (str), max_redirects=5, timeout=3.0
Output: ResolvedURL(final_url, final_host, hop_count) | ShortenerResolutionError

Ablauf:
1. httpx.Client(
       follow_redirects=True,
       max_redirects=5,
       timeout=3.0,
       headers={"User-Agent": "Mozilla/5.0 (compatible; pundo-bot/1.0)"},
       verify=True,                       -- TLS prüfen
   )

2. Vor jedem Redirect-Hop: SSRF-DNS-Check (siehe 6.)

3. client.head(url) — folgt Redirects.
   Fallback: client.get(url, headers={"Range": "bytes=0-0"}) wenn HEAD 405.

4. Finales response.url → normalize_host() → Ergebnis.

5. Fehlerbehandlung → ShortenerResolutionError mit Grund:
   - timeout         → "timeout"
   - too_many_hops   → "too_many_redirects"
   - ssrf_blocked    → "private_ip_blocked"
   - ssl_error       → "ssl_error"
   - connection_err  → "connection_error"
```

---

### 2.5 Haupt-Validierungs-Funktion (`validate_social_links`)

```
Input:  social_links (dict | None), db Session
Output: list[SocialLinkViolation]  (leer = alles ok)

Datenstruktur social_links (wie in Shop.social_links JSONB):
  {
    "facebook": "https://...",
    "instagram": "https://...",
    ...
    "other": {"key": "xing", "url": "https://..."}  -- Sonstiges
  }

Algorithmus:
  Für jeden Wert (URL-String oder {"key":..., "url":...}):
    1. URL extrahieren
    2. normalize_host() → apex
       Falls None → SocialLinkViolation(key, "invalid_url", ...)
    3. check_host_blocked(apex, session)
       Falls Treffer → SocialLinkViolation(key, category, resolved_host=apex)
    4. is_shortener_host(apex, session)
       Falls ja:
         resolve_shortener(url)
           OK → apex_final = normalize_host(final_url)
                check_host_blocked(apex_final, session)
                Falls Treffer → SocialLinkViolation(key, category,
                                                     resolved_host=apex_final,
                                                     via_shortener=True)
           Fehler → SocialLinkViolation(key, "shortener_unresolvable",
                                         via_shortener=True)
  Timeout Gesamtlimit: asyncio.wait_for / ThreadPoolExecutor mit 5s hard-cap
  (alle Links parallel via concurrent.futures, max 6 threads).
```

---

### 2.6 Pydantic-Modelle (Response-Typen)

```python
class BlocklistHit(BaseModel):
    host: str
    category: str
    source: str

class SocialLinkViolation(BaseModel):
    key: str
    error: str          # "adult" | "gambling" | ... | "shortener_unresolvable" | "invalid_url"
    resolved_host: str | None = None
    via_shortener: bool = False

class ResolvedURL(BaseModel):
    final_url: str
    final_host: str
    hop_count: int
```

---

## 3. API-Endpoints

Alle Admin-Endpoints folgen dem bestehenden Muster in `ingestor/api/admin/`.

### 3.1 Neue Datei: `ingestor/api/admin/social_link_rules.py`

Router-Prefix: `/social-link-rules`, eingebunden in `admin_router` mit Tag `admin-social-link-rules`.

```
GET  /api/v1/admin/social-link-rules
  Auth: require_admin (JWT Bearer)
  Query-Params:
    q: str?           -- Substring-Filter auf host
    category: str?    -- exakter Filter
    source: str?      -- 'admin' | 'external'
    limit: int = 20   -- max 500
    offset: int = 0
  Response 200: PaginatedResponse[SocialLinkRuleResponse]

POST /api/v1/admin/social-link-rules
  Auth: require_admin
  Body:
    { "host": "badsite.example",
      "category": "adult",
      "note": "optional" }
  Validierung: normalize_host(host) muss gültigen Apex ergeben
  Response 201: SocialLinkRuleResponse
  Response 422: {"detail": "invalid_host"} bei nicht-normalisierbarem Host

PATCH /api/v1/admin/social-link-rules/{id}
  Auth: require_admin
  Body (alle optional):
    { "category": "gambling", "note": "updated note" }
  Response 200: SocialLinkRuleResponse
  Response 404: wenn id nicht gefunden oder source = 'external'
  Hinweis: 'external'-Einträge sind read-only für Admin — Coder muss 404/403
           zurückgeben wenn source != 'admin'

DELETE /api/v1/admin/social-link-rules/{id}
  Auth: require_admin
  Einschränkung: nur source = 'admin'-Einträge löschbar
  Response 204: No Content
  Response 403: wenn source = 'external'

GET /api/v1/admin/social-link-rules/categories
  Auth: require_admin
  Response 200: {"categories": ["adult","gambling","hate","illegal","malware"]}
  (kein DB-Zugriff, statische Enum-Liste)
```

**Schema `SocialLinkRuleResponse`:**
```python
class SocialLinkRuleResponse(BaseModel):
    id: int
    host: str
    category: str
    source: str
    note: str | None
    external_list: str | None
    created_at: datetime
    updated_at: datetime
```

---

## 4. Cron / Worker

### 4.1 Neue Datei: `ingestor/workers/social_link_blocklist_importer.py`

```
Funktion: import_external_blocklists(session: Session) -> ImportStats

Ablauf:
  1. StevenBlack/hosts (porn-Kategorie)
     URL: https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts
     Format: "0.0.0.0 hostname" (einer pro Zeile), Kommentare mit "#"
     Parsing: Zeilen filtern, die mit "0.0.0.0 " beginnen → hostname extrahieren
     → category = 'adult', external_list = 'stevenblack_porn'

  2. URLhaus (Malware)
     URL: https://urlhaus.abuse.ch/downloads/hostfile/
     Format: ähnlich hosts-Format oder CSV
     → category = 'malware', external_list = 'urlhaus_malware'

  Für jede Quelle:
    a. HTTP GET mit httpx, timeout=30s, User-Agent gesetzt.
    b. SHA-1 des Response-Body berechnen.
    c. Prüfe ob letzter Import dieselbe SHA-1 hat (gespeichert in
       einer kleinen Hilfstabelle oder als distinct external_batch
       im ersten Eintrag der Liste) → wenn gleich: SKIP (idempotent).
    d. Hosts normalisieren via tldextract (apex-only), invalide verwerfen.
    e. Diff-Import:
       - BEGIN TRANSACTION
       - DELETE FROM social_link_blocklist
         WHERE source = 'external' AND external_list = :list_name
       - Batch-INSERT der neuen Einträge (1000er-Chunks via
         INSERT ... ON CONFLICT (host, source) DO UPDATE)
       - COMMIT
    f. Log: Anzahl added/removed, SHA-1, Zeitstempel.

  Gibt ImportStats(list_name, added, removed, skipped, duration_s) zurück.
```

**Fehlerbehandlung:**
- HTTP-Fehler / Timeout: Log + continue (andere Liste noch importieren).
- DB-Fehler: Rollback + Log. Admin-Einträge bleiben unangetastet (separates `source`).
- Partielle Imports werden vollständig zurückgerollt (Transaktion pro Liste).

---

### 4.2 APScheduler-Einbindung in `ingestor/api/main.py`

Im bestehenden `_start_scheduler()`:

```python
from ingestor.workers.social_link_blocklist_importer import import_external_blocklists

def _run_blocklist_import():
    with get_session() as session:
        try:
            import_external_blocklists(session)
        except Exception:
            logger.exception("social_link_blocklist_import failed")

scheduler.add_job(
    _run_blocklist_import,
    "cron",
    hour=3,
    minute=0,
    id="social_link_blocklist_import"
)
```

**Zeitpunkt:** 03:00 UTC täglich (außerhalb Stoßzeiten, vor dem 08:00-Alert-Job).

---

### 4.3 Ops-Hinweis: Manueller Initial-Import

Nach dem Deployment muss der erste Import manuell angestoßen werden, da APScheduler erst beim nächsten 03:00-UTC-Slot greift:

```bash
# Im Backend-Repo:
python -c "
from ingestor.db.connection import get_session
from ingestor.workers.social_link_blocklist_importer import import_external_blocklists
with get_session() as s:
    stats = import_external_blocklists(s)
    print(stats)
"
```

Dieser Aufruf kann auf Prod und Test-DB separat erfolgen. Für Test-DB `DATABASE_URL=...pundo_test` setzen.

---

## 5. Validierung im Shop-Update-Endpoint

### 5.1 Einbaupunkt

**Datei:** `ingestor/api/shop_owner_shop.py`
**Funktion:** `patch_shop()` (PATCH `/api/v1/shop-owner/shop`)

Einhaken **vor** dem `session.commit()`, nachdem `body.social_links` verarbeitet wurde:

```python
# Nach dem bestehenden:
#   if body.social_links is not None:
#       shop.social_links = body.social_links

if body.social_links is not None:
    from ingestor.lib.social_link_moderation import validate_social_links
    violations = validate_social_links(body.social_links, session)
    if violations:
        v = violations[0]   # ersten Verstoß melden
        raise HTTPException(
            status_code=422,
            detail={
                "error": "social_link_blocked",
                "key": v.key,
                "category": v.error,
                "resolved_host": v.resolved_host,
                "via_shortener": v.via_shortener,
            }
        )
    shop.social_links = body.social_links
```

**Entscheidung:** Bei mehreren Verstößen wird nur der erste zurückgegeben (einfachste UX, Frontend zeigt Fehler unter dem spezifischen Feld). Falls künftig alle Verstöße gemeldet werden sollen, kann `detail` ein Array werden — Coder soll Hinweis in `03-implementation.md` dokumentieren.

### 5.2 422-Response-Format (exakt)

```json
{
  "detail": {
    "error": "social_link_blocked",
    "key": "other",
    "category": "adult",
    "resolved_host": "pornhub.com",
    "via_shortener": true
  }
}
```

Bei nicht auflösbarem Shortener:
```json
{
  "detail": {
    "error": "shortener_unresolvable",
    "key": "other",
    "category": null,
    "resolved_host": null,
    "via_shortener": true
  }
}
```

Bei ungültiger URL:
```json
{
  "detail": {
    "error": "invalid_url",
    "key": "other",
    "category": null,
    "resolved_host": null,
    "via_shortener": false
  }
}
```

### 5.3 Logging für Phase-1-Audit (kein PII)

```python
logger.info(
    "social_link_blocked shop_id=%d key=%s category=%s host=%s via_shortener=%s",
    shop.id, v.key, v.error, v.resolved_host, v.via_shortener
)
```

Kein `url` (enthält Pfad/Usernamen = PII), nur `host`. Dieser Log ist die Basis für spätere Admin-Audit-UI (Phase 2).

---

## 6. SSRF-Mitigationen

### 6.1 Privat-IP-Blockliste (vor jedem HTTP-Request)

```python
import ipaddress, socket

PRIVATE_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local / AWS metadata
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("0.0.0.0/8"),
]

def _is_private_ip(host: str) -> bool:
    try:
        addr = ipaddress.ip_address(host)
        return any(addr in r for r in PRIVATE_RANGES)
    except ValueError:
        pass
    try:
        ip_str = socket.gethostbyname(host)
        addr = ipaddress.ip_address(ip_str)
        return any(addr in r for r in PRIVATE_RANGES)
    except Exception:
        return True   # DNS-Auflösung fehlgeschlagen → blocken
```

Diese Funktion wird aufgerufen:
- Vor dem initialen `httpx`-Request (URL-Host).
- Nach jedem Redirect-Hop (Redirect-Target-Host) via `httpx`-Event-Hook.

### 6.2 DNS-Rebinding-Schutz

httpx unterstützt keine nativen Pre-Connect-Hooks. Lösung: Custom `httpx.HTTPTransport` mit überschriebener `handle_request`, die nach dem TCP-Connect die aufgelöste IP prüft. Alternativ: die `socket.gethostbyname()`-Prüfung in `_is_private_ip` auf jeden Redirect-Hop anwenden — ausreichend für diesen Use-Case.

### 6.3 Weitere SSRF-Härtungen

| Maßnahme | Konfiguration |
|---|---|
| `follow_redirects=True, max_redirects=5` | Verhindert Endlos-Redirect-Schleifen |
| `timeout=httpx.Timeout(3.0)` | Verhindert Hängen |
| Nur `http` / `https` Schemas akzeptieren | `file://`, `ftp://` etc. ablehnen vor Request |
| User-Agent explizit setzen | Verhindert Fingerprinting-Fehler |
| TLS-Verifikation an | `verify=True` (default httpx) |
| `scheme` nach Redirect prüfen | Kein `http→file://`-Redirect |
| Max Redirect-Zeit gesamt | Inklusive DNS-Auflösung: 3s Gesamttimeout |

---

## 7. Risiken

### R1 — Falsche Positive bei externen Blocklisten

**Risiko:** StevenBlack/hosts enthält gelegentlich Fehleinträge (z.B. legitime Gesundheits-Domains). Ein Shop-Owner kann seinen zulässigen Link nicht speichern.

**Mitigation:**
- Admin-Override: ein `source='admin'`-Eintrag mit negativer Kennzeichnung ist **nicht** implementiert (YAGNI für Phase 1). Stattdessen: Admin löscht den `external`-Eintrag nicht (der Cron würde ihn zurückbringen), sondern legt einen eigenen Filter-Mechanismus fest.
- **Empfehlung für Coder:** Füge ein optionales Boolean-Feld `allowlisted` zur `social_link_blocklist`-Tabelle hinzu (default `false`). Wenn `allowlisted = true` und `source = 'admin'`, wird der Host **nicht** geblockt (Positivliste). Dies löst das Falsch-Positiv-Problem strukturell. Coder entscheidet ob Phase 1 oder Phase 2.

### R2 — Performance bei Shortener-Auflösung

**Risiko:** Ein Shop-Owner hat 6 Social-Links, alle Shortener-basiert. Sequenziell = bis zu 6 × 3s = 18s.

**Mitigation:** `concurrent.futures.ThreadPoolExecutor(max_workers=6)` für parallele Auflösung. Globaler Hard-Cap von 5s via `wait(timeout=5)` — nicht aufgelöste Links werden als Fehler behandelt. Akzeptiert gemäß AC9 (max. 5s gesamt).

### R3 — Externe Liste offline

**Risiko:** StevenBlack/hosts oder URLhaus nicht erreichbar → Import schlägt fehl → Blocklist veraltet.

**Mitigation:** Fail-safe: bestehende DB-Einträge bleiben. Kein Löschen wenn HTTP-Fehler. Log + Monitoring-Alert (im bestehenden Log-System als `ERROR`-Level). Nächster Cron-Lauf versucht erneut.

### R4 — Shortener mit JS-Redirect oder CAPTCHA

**Risiko:** `bit.ly` gibt bei HEAD einen 200 zurück mit JS-Redirect-Body statt HTTP-Redirect. Final-Host ist dann `bit.ly` selbst → fälschlich als "unresolvable" oder "nicht geblockt" behandelt.

**Mitigation:** `resolve_shortener` löst einen HTTP-Redirect-Follow. JS-Redirects werden **nicht** ausgeführt (kein Browser). Entscheidung: fail-closed — wenn Final-Host == Shortener-Host, wird als unresolvable behandelt. Akzeptierter Kompromiss.

### R5 — Timing-Angriff (Shortener-Auflösung)

**Risiko:** Angreifer kann anhand der Response-Latenz erkennen, ob sein Shortener-Link aufgelöst wurde.

**Mitigation:** Kein relevantes Angriffsziel (kein Auth-Bypass, kein Datenleck). Akzeptiert.

### R6 — Blocklist-Größe / DB-Wachstum

**Risiko:** StevenBlack/hosts porn-Kategorie hat ~60.000 Hosts, URLhaus ~200.000 Einträge. Zusammen ~260.000 Zeilen.

**Mitigation:** Textfeld `host` VARCHAR(253) + B-Tree-Index → lookup < 1ms. Gesamtgröße < 50 MB. Kein Redis-Cache nötig. Akzeptiert.

---

## 8. Nummerierte Task-Liste für den Backend-Coder

| # | Task | Datei(en) | Abhängigkeit |
|---|---|---|---|
| **T1** | `pyproject.toml`: Dependency `tldextract>=5.1` hinzufügen | `pyproject.toml` | — |
| **T2** | Alembic-Migration `l5f6a7b8c9d0` erstellen: Tabellen + Indizes + Shortener-Seed | `ingestor/db/migrations/versions/l5f6a7b8c9d0_social_link_moderation.py` | T1 |
| **T3** | Service-Modul `ingestor/lib/social_link_moderation.py` implementieren: `normalize_host`, `check_host_blocked`, `is_shortener_host`, SSRF-Check `_is_private_ip`, `resolve_shortener`, `validate_social_links` | `ingestor/lib/social_link_moderation.py` | T2 |
| **T4** | Pydantic-Schemas für Admin-CRUD in `ingestor/schemas/admin.py` ergänzen: `SocialLinkRuleCreate`, `SocialLinkRulePatch`, `SocialLinkRuleResponse` | `ingestor/schemas/admin.py` | — |
| **T5** | Admin-Router `ingestor/api/admin/social_link_rules.py` implementieren: GET (paginiert, filterbar), POST, PATCH, DELETE, GET /categories | `ingestor/api/admin/social_link_rules.py` | T2, T4 |
| **T6** | Admin-Router in `admin/__init__.py` registrieren | `ingestor/api/admin/__init__.py` | T5 |
| **T7** | `patch_shop()` in `shop_owner_shop.py` erweitern: `validate_social_links` aufrufen, 422-Response wenn Verstoß, Logging | `ingestor/api/shop_owner_shop.py` | T3 |
| **T8** | Worker `ingestor/workers/social_link_blocklist_importer.py` implementieren: Download StevenBlack + URLhaus, SHA-1-Diff, Batch-INSERT, Fehlerbehandlung | `ingestor/workers/social_link_blocklist_importer.py` | T2, T3 |
| **T9** | APScheduler-Job in `main.py` für täglichen Blocklist-Import (03:00 UTC) eintragen | `ingestor/api/main.py` | T8 |
| **T10** | Unit-Tests: `normalize_host` (Subdomain, IP, invalid), `_is_private_ip`, `check_host_blocked` (mock DB), `validate_social_links` (alle Violations), `resolve_shortener` (mock httpx) | `ingestor/tests/test_social_link_moderation.py` | T3 |
| **T11** | Unit-Tests: Admin-CRUD-Endpoints (TestClient, mock DB) | `ingestor/tests/test_social_link_rules_api.py` | T5 |
| **T12** | `alembic upgrade head` gegen pundo_test laufen lassen, manuellen Blocklist-Import (T8) einmalig ausführen | ops | T9 |
| **T13** | Ruff + mypy + black auf alle geänderten Dateien — null Fehler | alle | alle |

---

## Anhang: Datenfluss-Übersicht

```
PATCH /api/v1/shop-owner/shop
  │
  ├─ body.social_links vorhanden?
  │    └─ validate_social_links(links, session)
  │         ├─ für jeden Link: normalize_host()
  │         │    └─ tldextract → apex
  │         ├─ check_host_blocked(apex, session)
  │         │    └─ SELECT social_link_blocklist WHERE host = apex
  │         └─ is_shortener_host(apex)?
  │              └─ resolve_shortener(url)
  │                   ├─ _is_private_ip() → SSRF-Block
  │                   ├─ httpx HEAD + follow redirects (max 5, 3s)
  │                   └─ normalize_host(final_url) → check_host_blocked()
  │
  ├─ violations → 422 + JSON-Detail
  └─ ok → session.commit()

APScheduler 03:00 UTC
  └─ import_external_blocklists()
       ├─ GET StevenBlack hosts → diff → DB upsert (external, adult)
       └─ GET URLhaus hostfile  → diff → DB upsert (external, malware)
```
