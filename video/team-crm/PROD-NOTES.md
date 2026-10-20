# team-crm: Produktionsnotizen (Stand 2026-10-19)

Team-Video 5 „CRM: contacts and safety“ (F8960 T22, Thema 5). Letztes Video der Serie (Outro verweist auf „Help“ in der Sidebar, `/admin/help`). EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht gegengelesen, F8960 O3).

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-crm.en.mp4` (1920×1080, 30 fps, 14,9 MB), `out/upload.en.mp4` (8,1 MB, libx264 crf 27), `.en.srt` (44 Cues), `.el.srt` (65 Cues), `thumbnail.en.png` (Szene „channels“) |
| Dauer | 226,1 s (3:46) |
| verify_output.py | OK |
| Kapitel (alle ≥ 10 s) | 0:00 The contact list · 0:41 Search first · 0:59 Add a contact · 1:19 Channels · 1:48 Needs review · 2:12 Outreach basics · 2:33 Opt-out · 3:01 Safety settings |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-crm en [--rerecord]`; danach Dev-Server beenden. Kein Gate/E2E parallel. Keine Pipeline-Dateien geändert (kein Regressionsvergleich nötig).

## Was das Video tut / nie tut
- Tut (nur pundo_test): Kontakt „Team Demo Maria“ (Org „Team Demo Cafe“, `maria.demo@pundo-e2e.io`) anlegen (POST ingest); Telefonkanal an „Team Demo Contact“ anhängen (POST channels); „Set state“ NEEDS_REVIEW → SOURCED (POST lifecycle); „Load preview“ (POST outreach/preview, nur Render).
- Tut nie: „Send email“ (nur überfahren), Suppress (Dialog geöffnet, Cancel), „Confirm business“ (setzt QUEUED), Safety-Settings ändern. Schutz: `fetch`-Wrapper im Browser verwirft jeden Schreibaufruf auf `outreach/send`, `suppress`, `confirm-business`, `crm/config`; Lauf bricht ab, wenn einer versucht wurde. Am Ende muss die Liste der CRM-Schreibaufrufe genau {ingest, channels, lifecycle, preview} sein (im Lauf bestätigt, `CRM write requests` im Log). Keine Mail, kein WhatsApp.

## Testdaten (`prepare_team.py` erweitert)
Vor jedem Lauf: löscht „Team Demo Maria“ (exakter Name + exakte Org + source manual) samt Kanälen/Quellen/Interaktionen/Nachrichten/Org; setzt „Team Demo Contact“ zurück (NEEDS_REVIEW, needs_human, version 1, nur die zwei Seed-Kanäle, keine Interaktionen/Nachrichten, `updated_at=now()` damit er die Liste anführt). Idempotent (Lauf 2 entfernte die Kontakt-Maria aus Lauf 1; nach dem Lauf erneut zurückgesetzt, geprüft: `crm_suppression` unverändert 261, 0 Nachrichten). Löschpfad zusätzlich in Rollback-Transaktion getestet.

## Faktenbelege (Code, 2026-10-19)
- Liste/Chips/Suche (Name, Org, E-Mail): `src/components/system-admin/crm/ContactList.tsx`, Backend `ingestor/api/admin/crm/contacts.py:61-108`. Anlegen: `ContactForm.tsx` (Org Pflicht, E-Mail oder Telefon Pflicht, Quelle), Start-State SOURCED `ingestor/lib/crm/service.py:~170`.
- Kanäle (Formular nur E-Mail/Telefon): `ChannelEditor.tsx`, `types/system-admin.ts:341`; letzter Kanal nicht entfernbar `service.py:446ff`/`crm_err_last_channel`. WhatsApp wird nur dokumentiert (`ManualInteractionForm.tsx`), nicht versendet.
- NEEDS_REVIEW entsteht u. a. bei Visitenkarten-OCR (`service.py:ingest_from_card`, Lifecycle NEEDS_REVIEW); „Confirm card“ nur mit Kartenbild (`ContactDetailActions.tsx`, `showConfirmCard`); sonst „Set state“ → SOURCED erlaubt (`ingestor/lib/crm/lifecycle.py`). „In this state we send nothing“ ist Regel aus Vault F7600 (NEEDS_REVIEW = kein Outreach), **im Code nicht erzwungen** (`outreach_send` prüft den State nicht).
- Outreach: Sprachen EL/EN/RU, Senden = echte SMTP-Mail an bevorzugte E-Mail (`service.py:outreach_send`).
- Suppress: alle Kanäle in Suppression-Liste, terminal, kein Rückweg in Admin/API gefunden (`lifecycle.py` TERMINAL_STATES; kein Unsuppress-Endpoint), Ingest/Kanal-Add verweigern unterdrückte Werte. Unsubscribe-Link in Mails setzt HARD_OPTOUT (`opt_out_by_token`) – im Video nicht erwähnt.
- Safety: Kill-Switch + Tageslimit `SafetyPanel.tsx`, `ingestor/lib/crm/config.py`.

## Befunde (nicht behoben)
1. „Confirm business“ setzt den Kontakt auf QUEUED (`service.py:277-307`), nicht nur `business_status`; SOP/Journey beschreiben es als „bestätigt“. Deshalb nicht gefilmt.
2. NEEDS_REVIEW-„kein Outreach“ nicht technisch erzwungen (s. o.).
3. Die SOP-Schritt „Check the channel flags: consent, reachable, preferred“ ist abgedeckt; die Zeile „Record how you got the contact“ = Quellenauswahl.

## Datenschutz-QA
- Strikte Schranke 3500/8500; Privacy-Check je Szene: **8 von 8 ok** (0 fremde E-Mails, 0 Passwortfelder), 0 Seitenfehler.
- CRM-Listen (pundo_test = Prod-Kopie, ca. 6 300 Kontakte, E2E-Datensätze): `armMask` (MutationObserver) blurt jede `tbody tr` ohne „Team Demo“; Aufnahme prüft, dass alle Fremdzeilen markiert sind (50 von 50 bzw. 5 von 5). Such-Szene: genau 1 Treffer. Kontaktseiten (Detail, Safety) zeigen nur Demo-Daten und sind nicht maskiert (erster Lauf maskierte dort fälschlich die Kanaltabelle – behoben, Neuaufnahme).
- Sichtprüfung: 3-s-Kontaktbögen über das ganze Video; 6-fps-Bögen (je 4 s) um den Klick „Needs review“ und die Suche (Enter): nur unscharfe Fremdzeilen, keine lesbare Fremdzeile. Szenenübergänge (Überblendung 0,4 s) nicht einzeln bei 6 fps gesichtet. Unschärfe 14 px bei 2× DSF.
- Sichtbar echte Zahl: „10 of 25 sent in the last 24 h“ (Testdaten, keine Person).

## Layout (ehrlich)
Desktop-Rahmen korrekt; Adresszeile je Szene genau eine Seite (Listenszenen zeigen `/admin/crm/contacts` auch mit Filter/Suche; Szene „create“ bleibt auf `/new` und endet eingefroren auf dem Formular mit Klick-Welle: der Sprechtext sagt deshalb nur „The system saves it“, die neue Kontaktseite wird nicht gezeigt). Detailszenen: `/admin/crm/contacts/9108` (Recorder prüft die ID gegen scenes.yml). Schrift der echten Seiten klein wie bei den anderen Team-Videos; Detailseite scrollt komplett (Sidebar scrollt mit). Audio-Aussprache nicht gehört. Die Liste zeigt viele rote HARD_OPTOUT-Badges (unscharf).
