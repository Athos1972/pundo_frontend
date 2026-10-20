# team-claims-owners: Produktionsnotizen (Stand 2026-10-19)

Team-Video 2 „Claims and shop owners“ (F8960 T18, Thema 2). EN-Stimme, EN-Untertitel eingebrannt, EL nur als `.el.srt`. **Kanal „pundo Team“, nicht gelistet, noch nicht hochgeladen.**
Status: **Entwurf.** EN-Sprechtext (`scenes.yml`) nicht von Bernhard freigegeben, EL nicht von Muttersprachler:in gelesen (F8960 O3). Reihenfolge und Begriffe folgen der SOP `claims-owners` (`src/lib/system-admin-help-content.ts`).

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-claims-owners.en.mp4` (1920×1080, 30 fps, 12 MB), `out/team-claims-owners.en.srt` (32 Cues), `out/team-claims-owners.el.srt` (53 Cues), `out/thumbnail.en.png` (Szene „accept“) |
| Dauer | 182,3 s (Ziel 200 s, Fenster 120–240 s) |
| `verify_output.py` | OK |
| Kapitel (alle ≥ 10 s) | 0:00 The claims queue · 0:34 Checking the proof · 1:00 Mark as verified · 1:18 Accept · 1:40 Reject · 2:02 Shop owners · 2:26 Support only |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-claims-owners en [--rerecord]`; danach Dev-Server beenden. Build ca. 7 min. Jeder Lauf ruft `prepare_team.py`, das beide Demo-Claims auf „open“ zurücksetzt (nachgewiesen: Lauf 2 und 3 starteten nach den Entscheidungen von Lauf 1/2 wieder mit zwei offenen Claims).

## Testdaten (Erweiterung `prepare_team.py`)
- Neu: Shop `team-demo-flower-corner` (Florist), Antragsteller `claimant2@pundo-e2e.io` („Team Demo Applicant Two“, pending), Claim 2 (E-Mail-Domain stimmt **nicht**), Claim 1 (Pet Corner, Domain stimmt) bekommt `proof_method=email_domain`.
- `upsert_claim` setzt die Claims bei jedem Lauf auf den Ausgangszustand (Status open, Entscheidungs-/Beweisfelder leer, Events außer `created` gelöscht); Antragsteller werden über `upsert_owner` wieder pending ohne Shop. IDs stabil (659 / 671).
- Seiteneffekt: Der Pilot (`team-admin-tour`) würde bei einem Re-Rec jetzt **drei** „Team Demo“-Shops in der Shop-Suche zeigen (Text sagt nur „our demo shops“, bleibt wahr), das Dashboard zeigt 2 offene Claims.
- Entscheidungs-Mails (Accept/Reject) gehen in den lokalen Mail-Sink der Testinstanz (`.mail-sink/`), nie nach außen.
- Belege/Upload-Dokumente: Die Demo-Claims haben **keine** Dokumente (Box „No documents.“). Es werden nie echte Belege gezeigt; der Satz im Sprechtext sagt deshalb „would appear“.

## Datenschutz-QA (AK 13)
- Strikte Schranke 3500/8500; Prüfung je Szene (fremde E-Mail/Passwortfeld = Abbruch): **7 von 7 Szenen `privacy ok`**.
- Claims-Liste: in `pundo_test` nur die zwei Demo-Claims (Aufnahme bricht ab, wenn < 2 Demo-Zeilen; Fremdzeilen würden unscharf). „Matching checks“ wird nur angehovert, nie geöffnet.
- Shop-Owners-Liste (echte Owner): unscharf (14 px) und danach Suche „Team Demo“ → 3 Demo-Owner.
- **Gefundener und behobener Fehler:** Beim ersten Aufnahmelauf waren in der Sichtprüfung (3 Bilder/s) zwei Frames der Shop-Owners-Liste **lesbar unmaskiert** (React überschrieb das einmalige `sess.mask` nach der Client-Navigation). Behebung: `armMask()` (MutationObserver blurt jede `tbody tr` ohne „Team Demo“ sofort, auch bei Re-Render), vor jedem Klick und vor `resume` aktiviert. Nach Fix: Sichtprüfung 6 Bilder/s über den ganzen Übergang (Claim-Detail → blurry Liste → Suche → Demo-Zeilen), kein lesbarer Frame. **Der Pilot `team-admin-tour/record.mjs` hat denselben latenten Fehler (nutzt das einmalige `mask`) und wurde nicht angefasst; vor dem nächsten Pilot-Re-Rec `armMask` übernehmen und die Frames neu sichten. Das bereits gepushte Pilotvideo sollte auf diese Frames geprüft werden.**
- Sichtprüfung: Szenenframes, Kontaktbögen alle 3 s (6 Bögen), 6-fps-Bogen über den kritischen Owner-Übergang, Vollbild Support-/Accept-Frame. Zwischenzustände < 1/6 s nicht einzeln gesichtet.
- Impersonation: nur gehovert (Test im Recorder: `page.on('dialog')` verwirft zusätzlich jedes `confirm`), nie geklickt. Auf der Shop-Seite erscheint nur der Demo-Owner `owner@pundo-e2e.io`.

## Layout-/Qualitätsbefunde (ehrlich)
- Schrift klein wie im Pilot (Dialoge, Panels ca. 12–13 px im 1080p-Bild); Dialog-Text auf Handy knapp lesbar.
- Adresszeile statisch je Szene: Szene „reject“ zeigt `/admin/claims`, obwohl kurz Liste und Detail #671 gezeigt werden; „owners“ zeigt `/admin/shop-owners` auch auf der Edit-Seite; „support“ `/admin/shops` auf der Shop-Edit-Seite. Szenen check/verify/accept zeigen `/admin/claims/659` (IDs sind im Recorder gegen scenes.yml geprüft).
- Szene „queue“: die ersten ca. 8 s sind noch das Dashboard (Begrüßung), bevor „Claims“ geklickt wird.
- Die Leaflet-Karte im Shop-Formular rendert im Screencast zerschossene Kacheln außerhalb des Rahmens; im Recorder nur für diese Szene ausgeblendet (`visibility:hidden`). Ob das ein echter Frontend-Mangel (Leaflet-CSS) ist, wurde nicht untersucht.
- Claim-Detail scrollt die ganze Seite (Sidebar scrollt mit raus); „Documents“ ist leer.
- Kein Callout für das Ergebnis „Application accepted“-Toast ist nur kurz am rechten unteren Rand sichtbar.
- Aussprache nicht gehört (TTS, „e-mail“, „Pet Corner“); vor Freigabe anhören. Sprechtext 157 s Audio, Szenen 17–29 s.
- EL-SRT 53 Cues; Timing folgt dem EN-Satz.

## Regression
Es wurden keine Pipeline-Dateien (`_branding/`, `brand.yml`, `build.sh`) geändert, daher kein Regressionsvergleich der Mobil-Videos.
