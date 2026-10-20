# team-translations: Produktionsnotizen (Stand 2026-10-20, Kapitel „Watch out“ neu)

Team-Video 4b „How translations come about“ (F8960 T21). Erklärvideo, kein SOP. EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht gegengelesen, F8960 O3).

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-translations.en.mp4` (1920×1080, 30 fps, 13,9 MB), `out/upload.en.mp4` (7,8 MB, libx264 crf 27), `.en.srt` (41 Cues), `.el.srt` (66 Cues), `thumbnail.en.png` |
| Dauer | 226,0 s (3:46) |
| verify_output.py | OK |
| Kapitel (alle ≥ 10 s) | 0:00 How it works · 0:56 What you can steer · 1:48 Watch out when saving · 2:26 Category names · 2:59 No marker |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-translations en [--rerecord]`; danach Dev-Server beenden. Kein Gate/E2E parallel. Keine Pipeline-Dateien geändert (kein Regressionsvergleich nötig).

## Bild
- Echt: Produkt-Bearbeiten „Team Demo Sourdough Loaf“ (nur angesehen, **nichts gespeichert**, Save nur überfahren) und Kategorie-Übersetzungstabelle „Team Demo Category“ (id -1; deutscher Name „Team Demo Kategorie“ wird getippt und gespeichert, danach versteckter Reload als Beleg, dass er gespeichert ist).
- Grafiken: `graphics.html` (lokal, `file://`, Branding-Farben/Schriften aus `_branding`, kein CDN), im Browserfenster-Rahmen; Adresszeile „pundo team · explainer“; Schritte werden mit `window.__step(n)` nach Wortzeiten des Sprechtexts eingeblendet.
- Es gibt **keine** Admin-Seite, die die Produktnamen je Sprache zeigt (ProductForm hat ein Namensfeld, `pickName`). Darum ist „Namen je Sprache“ nur als beschriftete Illustration (Demo-Werte) gezeigt.

## Testdaten
`prepare_team.py` (erweitert): löscht vor jedem Lauf alle Übersetzungen der Demo-Kategorie außer en + el (nur diese Kategorie) und setzt en/el neu. Idempotent. Weitere Demo-Daten unverändert.

## Faktenbelege (Code, 2026-10-19)
- Kein automatischer Start beim Speichern: Admin-Anlegen/PATCH `pundo_main_backend/ingestor/api/admin/products.py:93-127` enthält keinen Dispatch.
- Automatisch eingereiht nur nach Shop-Katalog-Import: `ingestor/ingestion/catalog_import/jobs.py:330` → `ingestor/translation/auto_dispatch.py`. Sonst CLI `ingestor/scripts/translate_products.py` (`docs/taxonomy.md:90-104`); in der Scheduler-Registry (`ingestor/tests/unit/test_scheduler_jobs_registry.py`, 12 Jobs) steht kein Übersetzungsjob. **Ob auf Hetzner ein Cron `translate_products` ruft, ist nicht geprüft (außerhalb des Repos).**
- Kette: `translate_products.py` → Gateway `translate.item` → Worker → Webhook `ingestor/lib/translation_handler.py` (Docstring Schritt 5: überschreibt nie vorhandene Sprachen; `translate_products.py:491-494` ebenso).
- PATCH ersetzt `names`: `src/components/system-admin/ProductForm.tsx:53` (`names: { en: … }`) + `ingestor/api/admin/products.py:122-124` (`setattr`). Folge: Normalauswahl von `translate_products` (`status_repository.py:146-190`) nimmt Items mit Status „translated“ nicht wieder auf (nur `--force`) → Sprachen kommen evtl. nicht von selbst zurück (deshalb „may not“).
- Kategorien: `PUT /admin/categories/{id}/translations` (`ingestor/api/admin/categories.py:212`, Upsert je Sprache, leer = löschen); `CategoryForm.tsx:93-116`. Kein Scheduler/Webhook schreibt `category_translations`.
- **Abweichung von der Vault-Notiz:** `seed_taxonomy.py` überschreibt Namen **nicht mehr** standardmäßig (B5900-033, Commit 8e774ba, 2026-10-19, auf origin/main): nur mit `--overwrite-names`. Das Video sagt deshalb „deliberate repeated seed with the overwrite option“. Ob Prod den Stand schon hat (O4) nicht geprüft.
- Kein Herkunftsmarker: F5983 (Idee, niedrige Priorität).

## Befunde (nicht behoben, außerhalb des Auftrags)
1. **Video 4 (`team-products`) widerspricht den Fakten:** „other languages are created in the background and appear after a short time“ und „If a translation looks wrong later, reword this source text and save again“. Speichern startet keine Übersetzung, der Handler überschreibt vorhandene Sprachen nie, und Speichern löscht die anderen Sprachen. Vor Veröffentlichung von Video 4 Sprechtext ändern; ebenso `src/lib/system-admin-help-content.ts` (Thema `translations`, Zeile ~175 „reword the original name … and save again“, „A background job picks the product up“) anpassen.
2. PATCH-Datenverlust (Warnung im Video, im Vault festgehalten).

## Datenschutz-QA
- Strikte Schranke 3500/8500; Privacy-Check je Szene: **6 von 6 ok** (0 fremde E-Mails, 0 Passwortfelder; sichtbar nur e2e-admin@pundo-e2e.io). 0 Seitenfehler.
- Echte Admin-Seiten zeigen ausschließlich Demo-Daten und keine Echtdaten-Listen (daher keine Unschärfe nötig). Marken-/Kategorie-`<select>` nie geöffnet. Beim Speichern der Kategorie wird vor dem Klick eingefroren; die Kategorieliste (Weiterleitung) erscheint nie.
- Sichtprüfung: 3-s-Kontaktbogen über das ganze Video; 6-fps-Bogen (48 Frames) um den Speichern-Klick: nur Formularframes, kein Listenframe. Übergänge zwischen Szenen sind Überblendungen (0,4 s) Grafik↔Demo-Seite, 6-fps nicht einzeln gesichtet.

## Layout (ehrlich)
Desktop-Rahmen korrekt, Grafiken im Fenster lesbar (ca. 20 px bei 1080p), untere Fensterhälfte der Grafiken bleibt leer. Schrift der echten Seiten klein (wie bei den anderen Team-Videos). Aussprache nicht gehört. Die Grafik der Kette erscheint nach dem Sprechtext Schritt für Schritt. EL-Text ungeprüft.

## Neuaufnahme 2026-10-20 (nach B8000-003 / Merge-PATCH)
- Kapitel „Watch out when saving“ neu: Speichern ändert nur den angezeigten Namen (meist EN), andere Sprachen bleiben, werden aber nicht aktualisiert (EN geändert → Team-Lead informieren); Übersetzungsjob überschreibt vorhandene Sprachfassung nie (`translation_handler.py`: „skip keys already present“, Zeilen 159-166; Beschreibungen analog Z. 168-179) → bei falscher Übersetzung Team informieren, das entscheidet über Neu-Übersetzung. Grafik „Achtung“ angepasst (Nachher-Karte: „kept, not updated“ statt „lost“, Hinweis-Box neu).
- Übrige Kapitel geprüft: gestrichen „A background translation job“ (→ „A translation job“), „picked up the next time the job runs“ (→ „wait until the team starts the next translation run“, SOP: Lauf startet das Team bzw. automatisch nach Katalog-Import), „Do not retype the name to fix it“ (→ „Retyping the name does not fix it“; Grafik ebenso). „may not come back“ entfernt. Kapitel Category names / No marker / Produkt-Edit-Szene unverändert zutreffend. Die Passage „PATCH ersetzt names“ in den Faktenbelegen oben und Befund 1/2 sind überholt.
- Datenschutz: 6/6 `privacy ok`, 0 Seitenfehler; keine Listen mit Echtdaten im Video (nur Grafiken, Produkt-Edit, Kategorie-Edit). Zwischenframes: kein Listenübergang vorhanden (Save der Kategorie wird vor dem Klick eingefroren). Warning-Grafik und Edit-Seite per Einzelframe gesichtet; Kapitelgrafik-Layout lesbar (EL/RU-Zeile bricht in der Nachher-Karte um, kein Überlauf).
- Backend-Stand wie bei team-products (8500 neu gestartet, Merge-PATCH belegt).
