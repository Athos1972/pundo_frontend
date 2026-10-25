---
id: admin-crm-needs-review
title: CRM NEEDS_REVIEW-Flow (F7600 Stufe 2, Org-Schnitt) — Kartenbeleg an der Quelle, Lead-Übergang, „Kanalzuordnung prüfen“
status: implemented
spec-file: e2e/journeys/admin-crm-needs-review.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-06-21-crm-stufe2-card-vision
touches-modules:
  - src/app/(system-admin)/admin/(portal)/crm/orgs/[id]/page.tsx
  - src/app/(system-admin)/admin/(portal)/crm/review/**
  - src/components/system-admin/crm/OrgLeadActions.tsx
  - src/components/system-admin/crm/CardImageViewer.tsx
  - src/components/system-admin/crm/ReviewList.tsx
  - src/components/system-admin/crm/transitions.ts
touches-roles:
  - admin (superadmin)
touches-states:
  - CrmOrg.lead_state:NEEDS_REVIEW
  - CrmOrg.lead_state:SOURCED
  - CrmReviewItem.status:open
  - CrmReviewItem.status:resolved
status-changed-at: 2026-06-21T00:00:00Z
status-changed-by-spec: 2026-06-21-crm-stufe2-card-vision
last-run: 2026-10-25T10:48:30Z
last-result: PASS
last-run-sha: null
---

### Journey: CRM NEEDS_REVIEW-Flow (Stufe 2, Org-Schnitt)

**Ziel:** Die Stufe-2-Oberfläche funktioniert auf dem neuen Modell ([F7600 CRM-Backbone], Spec `2026-10-25-crm-person-contact-modell`):
- Eine Organisation im Lead-Status `NEEDS_REVIEW` zeigt die passenden Lead-Aktionen (`OrgLeadActions`).
- Das Kartenbild ist ein Beleg **an der Quelle** (`crm_org_source`), nicht mehr ein Feld am Contact; ohne Kartenbild wird kein `CardImageViewer` gerendert und „Confirm card“ fehlt (AK7, AK12).
- Der Übergang `NEEDS_REVIEW → SOURCED` geht über den Dialog „Set lead status“ (AK4).
- Neu: Hinweis „Kanalzuordnung prüfen“ an der Org-Seite mit Link auf die Review-Liste `/admin/crm/review?category=channel_owner`, Erledigen des Eintrags (Design AC 24, R2 unklare Kanäle).

**Setup-Strategie:** Der Telegram-/Card-Vision-Pfad braucht Bot und Worker; er ist durch Backend-Integrations- und Vertragstests belegt (Listenform-Fixture `ingestor/tests/fixtures/crm_card_vision/list_form.json`, solange der Worker-Patch T12 Worker-Ausgabe der Kartenerkennung erweitern geparkt ist). Die Journey legt `NEEDS_REVIEW`-Orgs über `POST /orgs` + `POST /orgs/{id}/lead` an; den Review-Fall „Wert gehört einer Person“ über eine Person mit persönlicher Mail und eine Org, die dieselbe Mail mitbringt (Backend legt die Org ohne diesen Wert an und öffnet `channel_owner_conflict`).

**Trigger-Regel:** P1, wenn `OrgLeadActions.tsx`, `CardImageViewer.tsx`, `ReviewList.tsx`, `transitions.ts`, `crm/orgs/[id]/page.tsx` oder `crm/review/**` im Diff sind, oder im Backend `ingestor/api/admin/crm/review.py` bzw. `ingestor/lib/crm/card_ingest.py`.

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `E2E NR {uuid}` (Quelle ohne Bild) | Org `NEEDS_REVIEW` per API | AK7/AK12: Quelle vorhanden, aber kein Viewer und kein „Confirm card“ |
| `E2E NR Card {uuid}` | Org `NEEDS_REVIEW` → `SOURCED` per Dialog | AK4 |
| Person mit persönlicher Mail + Org mit Telefon und derselben Mail | Review `channel_owner_conflict` | Hinweis „Kanalzuordnung prüfen“, Erledigen |
| `NEEDS_REVIEW`-Org ohne Konflikt | Gegenprobe | Hinweis erscheint dort nicht |

**Schritte (Runbook):**

1. Org im Lead-Status `NEEDS_REVIEW` per API anlegen; keine Quelle hat `has_card_image.front/back`.
2. Detailseite: Badge `NEEDS_REVIEW`; Quelle unter „Sources and proofs“ sichtbar, aber `crm-card-images-{source_id}` fehlt und „Business Card Photos“ fehlt (AK7); „Confirm card“ fehlt, „Reject (private)“ ist da (AK12).
3. Dialog „Set lead status“ → `SOURCED` → Badge und API `lead.state = SOURCED` (AK4).
4. Konfliktfall: Person mit persönlicher Mail; Org mit Telefon und derselben Mail anlegen → 201, Org bekommt nur das Telefon, `open_review_count = 1`, Review `channel_owner_conflict` mit Person und Wert.
5. Org-Seite zeigt „Check channel assignment: …“ (`role=status`) mit Link → `/admin/crm/review?category=channel_owner`: Eintrag mit Org-Link, Personen-Link, Wert und „Value already belongs to someone else“; „Done“ → Eintrag weg, DB `status = resolved` mit `resolved_at`, `open_review_count = 0`, der Hinweis verschwindet.
6. Gegenprobe: die `NEEDS_REVIEW`-Org ohne Konflikt zeigt den Hinweis nicht.

**Akzeptanzkriterien:**

| AC | Was | Kriterium |
|---|---|---|
| AK4 | `NEEDS_REVIEW → SOURCED` | Dialog „Set lead status“ führt zu `SOURCED` (UI und API) |
| AK7 | Kein CardImageViewer ohne Kartenbild an der Quelle | Viewer und Überschrift fehlen, Quelle ist sichtbar |
| AK12 | „Confirm card“ nur mit Kartenbild | Knopf fehlt ohne Bild |
| Design AC 24 | „Kanalzuordnung prüfen“ | Hinweis sichtbar, Review erledigbar, DB `resolved` |

**Nicht in der Journey (bewusst):** Der positive Kartenbild-Fall (Quelle mit Bild → Viewer und „Confirm card“) entsteht nur über Telegram/Card-Vision oder SQL und ist durch Komponententests mit aufgezeichneter Antwort abgedeckt. Die Review-Kategorie „Beziehungen ohne Rolle“ prüft die API-Abnahme im Testbericht.

**Cleanup:** Lead-Orgs werden per Suppress (`HARD_OPTOUT`) geschlossen, Personen gelöscht.

**Historie:** Bis 2026-10-25 lief die Journey über `/admin/crm/contacts/[id]` mit `CrmContact.lifecycle_state` und `card_image_front_url` am Contact; umgestellt im Org-Schnitt (T19 Playwright-Specs anpassen, Doku durch den e2e-tester).
