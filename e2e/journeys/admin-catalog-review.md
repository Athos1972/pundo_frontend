---
id: admin-catalog-review
title: Katalog-Review-Übersicht + Stichprobe + Approve/Reject-Rework (F5980)
status: implemented
spec-file: e2e/journeys/admin-catalog-review.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: 2026-10-13-e2e-isolation-hygiene
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/catalog-review/**
  - src/components/shop-admin/catalog-review/**
  - src/components/shop-admin/catalog-consent/**
touches-roles:
  - shop-owner
touches-states:
  - CatalogCase.status:awaiting_owner_review
  - CatalogCase.status:published
  - CatalogCase.status:rework_in_progress
  - CatalogCase.status:consent_given
  - CatalogCaseItem.status:enriching
  - CatalogCaseItem.status:translate_failed
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-e2e-isolation-hygiene
last-run: 2026-10-19T08:57:00Z
last-result: PASS
last-run-sha: a898967
---

# Journey: admin-catalog-review

**Status:** implemented
**Priority:** P1
**Angelegt in:** B8950-012 (Katalog-Drift: Zeile verlinkte bisher auf die .spec.ts, es gab keine `<id>.md`)

## Purpose

Content-Review-UI der Auto-Kette: Intake-Batch (catalog_case_id) → describe/translate/categorize/attribute/embed (per Gateway 8600 mit Canned-Antworten) → Owner prüft Stichprobe → Approve (Publish-Gate) bzw. Reject → Rework-Loop. Läuft im Worker-Shop (Marker E2E-<RUN>-CATALOG-REVIEW). Ohne Gateway 8600 werden T0/T1/T2/T4 sichtbar mit Begründung übersprungen (B8950-012, Entscheidung 7).

## Vorbedingungen

- Gateway-Test-Server 8600 (`pundo_llm_gateway/scripts/start_test_server.sh`), Backend 8500 mit `LLM_GATEWAY_URL=http://localhost:8600`.
- Test-Worker (`pundo_llm_workers/restart_test_worker.sh`, `worker.test.yml`; nie `worker.prod.yml`): arbeitet die Gateway-Queue ab; `driveChain()` in der Spec ist nur Beschleuniger (B8950-013 §10). Ohne Worker bleibt die Kette an fremden Queue-Tasks hängen.
- Fehlt Gateway oder Worker, überspringen T0/T1/T2/T4 sichtbar mit Grund (Override des Worker-Checks: `E2E_LLM_WORKER_CHECK=0`).
- Selbst gestartete Gateway-/Worker-Prozesse nach dem Lauf beenden (Gateway: `lsof -ti TCP:8600 -sTCP:LISTEN | xargs kill`, Worker: `pkill -f 'workers.main worker.test.yml'`).

## F5982: Canned-Antworten aus Golden-Fixtures, Wirkung, Teilfehler

- Die Canned-Antworten sind die Golden-Fixtures des Workers (`$WORKERS_REPO/tests/contracts/golden/<job_type>.json`, Default `/Users/bb_studio_2025/dev/github/pundo_llm_workers`), nur um Payload-Werte ergänzt. Fehlt das Verzeichnis, werden die Kettenschritte sichtbar übersprungen.
- **T1b (Wirkung):** alle 6 Sprachen in `items.names`/`descriptions` mit den Canned-Werten, `category_id` = gewählter Kandidat, Attributwert mit `source='ai_extracted'` (nur wenn die Kategorie Slots hat; sonst sichtbare Annotation, nie still grün), genau eine Zeile in `catalog_case_item_embeddings`, Item `ready_for_review` mit vier `done`-Schritten.
- **T6 (Teilfehler):** ein per `POST /v1/tasks/{id}/fail` fehlgeschlagener `translate.item`-Task: der Fall erreicht `awaiting_owner_review`, `completed_item_count=1` von 2, das Item steht mit `translate_failed` und `last_error` in der Stichprobe, seine unabhängigen Schritte (categorize/embed) liefen trotzdem.
- **E2E-Tester (F5982):** `pundo_test` hat keine `category_attribute_definitions`. Der Canned-Worker legt deshalb beim `categorize.item` für die gewählte Kategorie einen Test-Slot `e2e_f5982_slot` an (`afterAll` löscht ihn); damit entsteht immer ein `enrich.product_attributes`-Task und T1b beweist `source='ai_extracted'` (nie still übersprungen). T6 prüft zusätzlich den gelben Hinweis in der UI.
- Nicht parallel wiederholbar (`--repeat-each` mit mehreren Workern teilt Gateway-Queue und RUN_ID; schon beim Stand von HEAD so); Wiederholung mit `--workers=1`.
- Mit Fan-out holt `driveChain()` bis zu drei Tasks je Item gleichzeitig; ein Test-Worker, der schneller antwortet als `driveChain` (Takt 1 s), kann T6 überspringen (sichtbar).

## Spec

`e2e/journeys/admin-catalog-review.spec.ts` — Ablauf und Assertions stehen dort (Quelle der Wahrheit).

## Testdaten

Marker-Konvention `E2E-<RUN>-…` (siehe `docs/e2e-testing.md`); Aufräumen per `workerShop`/`specShop`/Tracker und Reporter.
