---
id: llm-effects-homesick-spotted
title: LLM-Wirkung Homesick und Spotted (Kundenanfrage, Gateway, Golden-Worker, Webhook, DB, Mail)
status: implemented
spec-file: e2e/journeys/llm-effects-homesick-spotted.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-10-19-vertragsinventur
touches-modules:
  - src/app/api/**
touches-roles:
  - customer
touches-states:
  - CustomerSimilaritySearch.status:done
  - SpottedSubmission.status:successful
  - SpottedSubmission.status:rejected
status-changed-at: 2026-10-20T00:00:00Z
status-changed-by-spec: 2026-10-19-vertragsinventur
last-run: 2026-10-20T00:00:00Z
last-result: PASS
---

### Journey: LLM-Wirkung Homesick und Spotted

**Ziel:** Wirkung statt Durchlauf (B8950-016 T14): Der Kunde loest die Anfrage ueber die echte Backend-API aus, der Auftrag
steht im Gateway-Testserver (8600), ein Golden-Canned-Worker beantwortet genau diesen einen Task mit der Golden-Fixture des
Workers (`pundo_llm_workers/tests/contracts/golden/<job_type>.json`), das Gateway sendet den signierten Webhook, und das
Backend schreibt das Ergebnis. Rot, wenn die Wirkung ausbleibt (kein Ergebnis in der DB, kein Angebot, keine Mail).

**Trigger-Regel:** Wenn `ingestor/lib/homesick_handler.py`, `ingestor/lib/spotted_handler.py`,
`ingestor/api/customer/customer_similarity_search.py`, `ingestor/api/customer/customer_spotted.py` oder
`pundo_llm_workers/tests/contracts/golden/` im Diff sind (P1).

**Voraussetzung:** Backend-Testinstanz (8500, `start_test_server.sh`, Mail-Sink 1025, `LLM_GATEWAY_URL` auf 8600) und
Gateway-Testserver 8600 (`pundo_llm_gateway/scripts/start_test_server.sh`, gleicher API-Key und HMAC wie das Backend).
Fehlt das Gateway oder die Golden-Fixture, werden die Tests mit Begruendung uebersprungen (nie still gruen).

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `e2e-<run>-llm-effects-*@pundo.com` | Kunde, auto-verifiziert | braucht verifizierten Kunden fuer Homesick und Spotted |
| `E2E-<run>-LLM-EFFECTS ...` | Anfragetext, Antworttext, Produktname | Marker: der Test findet nur den eigenen Task (`payload_contains`) und raeumt nur Eigenes |
| erster aktiver Shop mit Standort | Ort des Spotted-Fotos (+ bis ~7 m Versatz) | Handler verlangt einen Shop im Umkreis von 500 m |

**Schritte (Runbook):**

1. Kunde registriert sich und meldet sich an (Token aus dem Set-Cookie).
2. A8: Homesick-Suche absenden, den Task im Gateway leasen, Golden-Antwort mit Marker-Text einreichen, auf `done` warten.
3. A9: Foto mit Koordinaten hochladen, Task leasen, Golden-Antwort mit Marker-Produktnamen einreichen.
4. A9 Fehlerpfad: Task mit `/fail` beenden.

**Akzeptanzkriterien:**

| AC | Was | Kriterium |
|---|---|---|
| AC1 | Homesick wirkt | `customer_similarity_searches.status = done`, `llm_response` enthaelt den Antworttext des Workers, `email_sent_at` gesetzt, Mail im Sink enthaelt die Antwort |
| AC2 | Spotted wirkt | `spotted_submissions.status = successful`, Shop aus dem Umkreis, Angebot (`offers`, source spotted, nicht archiviert), Item mit dem Produktnamen des Workers, Mail im Sink |
| AC3 | Spotted-Fehlerpfad | fehlgeschlagener Task fuehrt zu `rejected` mit `error_reason = vision_failed` |

**Aufraeumen:** `afterAll` loescht Spotted-Zeilen, Angebot, Listing und Item des Markers per psql (nur pundo_test); der
Kunde wird vom Teardown (Marker `e2e-<run>-`) entfernt.

**Nicht abgedeckt (Follow-up):** `translate.shop` (A3) und `categorize.descend` (A5): Ausloeser sind Admin-/Intake-Wege,
die eigene Fixtures brauchen.
