# team-admin-tour: Produktionsnotizen (Stand 2026-10-19)

Team-Video 1 „pundo admin tour“ (F8960, Thema 1, Pilot). EN-Stimme, EN-Untertitel eingebrannt, EL nur als `.el.srt`. **Kanal „pundo Team“, nicht gelistet, noch nicht hochgeladen.**
Status: **Entwurf.** Der EN-Sprechtext (`scenes.yml`) ist von Bernhard noch nicht freigegeben, der EL-Text noch nicht von Muttersprachler:in gelesen (F8960 O3).

## Ergebnis
| Größe | Wert |
|---|---|
| Datei | `out/team-admin-tour.en.mp4` (1920×1080, 30 fps, H.264 + AAC, 9,5 MB), `out/team-admin-tour.en.srt` (28 Cues), `out/team-admin-tour.el.srt` (45 Cues), `out/thumbnail.en.png` |
| Dauer | 163,2 s (Intro 5,6 s, 8 Szenen 15,9–22,6 s, Outro 11 s); Ziel 170 s, Fenster 120–240 s |
| `verify_output.py` | OK, keine Warnung |
| Kapitel (alle ≥ 10 s) | 0:00 Dashboard · 0:26 Sidebar · 0:45 Shops · 1:02 Products and categories · 1:18 Claims and reviews · 1:36 CRM · 1:54 Test or live? · 2:16 Help |

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (`format: desktop`, `voice_langs: [en]`, `subtitle_langs: [el]`, `thumbnail_scene: dashboard`) + 8 Szenen, je `narration.en`, `subtitle.el` (gleiche Satzzahl wie EN, also satzgenau), `chapter`, `window_path`; Szene „environment“ mit `window_highlight: true` (Rahmen um die Adresszeile) |
| `record.mjs` | strenger Modus (3500/8500, kein E2E-Lauf, Datenschutz-Prüfung je Szene), API-Login, ruft `../team-common/prepare_team.py`. Die Schranke läuft **vor** dem Prepare, damit eine falsche Instanz die DB nicht einmal anfasst |
| `../team-common/prepare_team.py` | Backend-venv, **nur pundo_test**; legt die synthetischen Demo-Datensätze an (siehe unten) |
| `../team-common/.recording-accounts.json` | `{"admin": {email, password}}` des E2E-Admins aus dem Test-Seed (gitignored, nie committen) |

## Bauen
```
cd ~/dev/github/pundo_frontend && npm run dev:test                       # :3500 (Dev-Server dieses Repos), danach wieder beenden
cd ~/dev/github/pundo_main_backend && ./scripts/start_test_server.sh      # :8500
cd ~/dev/github/pundo_frontend && video/build.sh team-admin-tour [--rerecord]   # nur EN; EL-SRT entsteht mit
```
Aufnahme dauert ca. 2:40 min, Build gesamt ca. 4 min. Keine parallelen Tests gegen `pundo_test` (der Recorder bricht bei laufendem E2E-Lauf ab).

## Testdaten `prepare_team.py`
Feste Schlüssel, Upsert, alle Mail-Adressen `@pundo-e2e.io`; fremde Zeilen werden nicht verändert (bei Slug-/Namenskollision Abbruch).
- Shops `team-demo-bakery` (Typ Bakery, Owner `owner@pundo-e2e.io`, approved) und `team-demo-pet-corner` (Typ Pet Shop), Fantasie-Adressen in Limassol
- offener Claim (#659 beim Pilotlauf) auf Pet Corner von `claimant@pundo-e2e.io` (Owner „pending“ ohne Shop), mit Event `created`
- Marke `team-demo-brand`, Kategorie `px-team-demo` (unter `px-cooking`, EN/EL-Name), Produkt `team-demo-sourdough-loaf`
- CRM: Org „Team Demo Bakery“, Kontakt „Team Demo Contact“ (`NEEDS_REVIEW`), Kanäle `contact@pundo-e2e.io` und WhatsApp `+35790000000` (HMAC mit dem Pepper aus dem Backend-`.env`)
- stellt `e2e-admin@pundo-e2e.io` über `scripts/seed_admin.py` sicher, falls er fehlt (in `pundo_test` vorhanden)

Belege:
- Abbruch: `DATABASE_URL_TEST=…/pundo` → `refusing: not pundo_test (pundo)`, Exit 1, nichts geschrieben.
- Idempotenz: Zeilenzahlen der Demo-Objekte (Shops 2, Owner 2, Claims 1, Marke 1, Kategorie 1 + 2 Übersetzungen, Produkt 1, CRM-Org 1, Kontakt 1, Kanäle 2) nach Lauf 1, 2 und 3 identisch (außerdem jeder Recorder-Lauf); IDs stabil. `--dry-run` rollt zurück.
- Verbrauch: Der Dry-Run verbraucht Sequenzwerte (IDs springen), das ist unkritisch.

## Datenschutz-QA (AK 13)
`pundo_test` ist eine Prod-Kopie (7242 Shops, 6269 CRM-Kontakte). Maßnahmen und Befunde:

| Szene | Echtdaten möglich | Maßnahme | Befund im Bild |
|---|---|---|---|
| dashboard, sidebar, environment | nein (Kennzahlen, Menü, Admin-Mail `@pundo-e2e.io`) | Abbruch-Prüfung | ok |
| shops | ja (alle Shops) | Klick auf „Shops“ bei **eingefrorenem** Bild (`sess.pause`), Zeilen sofort ohne „Team Demo“ unscharf (14 px), erst dann `resume`; Suche „Team Demo“ → nur die zwei Demo-Shops | unscharfe Liste unlesbar (Vollbild gesichtet), danach nur Demo-Zeilen |
| catalog | ja (Produkte, Kategorie-Baum) | wie Shops; Kategorie-Baum ebenfalls komplett unscharf (`ul.py-1`) | beide unscharf unlesbar (Vollbild gesichtet), danach nur Demo-Produkt und Demo-Kategorie |
| claims | ja (Antragsteller-Mails) | Abbruch, wenn keine Demo-Zeile da ist; Fremdzeilen würden unscharf | in `pundo_test` nur der Demo-Claim; Mail `claimant@pundo-e2e.io` |
| claims (Reviews) | ja | Abbruch, wenn der Tab „Reported“ nicht leer ist | „No reviews found“ |
| crm | ja (Kontakte mit E-Mail, Namen) | wie Shops; Suche „Team Demo“ | unscharfe Liste unlesbar (Vollbild gesichtet), danach nur der Demo-Kontakt |
| help | nein | – | ok |

Je Szene lief die automatische Prüfung (E-Mail außerhalb `@pundo-e2e.io` oder sichtbares Passwortfeld = Abbruch) zu Beginn und Ende: **8 von 8 Szenen `privacy ok (0 foreign emails, 0 password fields)`**.

**Negativtest 1 (Datenschutz):** CRM-Liste ungefiltert und unmaskiert aufgenommen → Abbruch `Privacy abort: e-mail outside @pundo-e2e.io visible: e2e-optout-75230696@test-e2e.invalid, e2e-optout-0b4f6d07@test-e2e.invalid, …`. Dieselbe Liste mit `sess.mask('tbody tr', 'Team Demo')` → kein Abbruch (maskierte Zeilen werden bewusst übersprungen, daher die Sichtprüfung des Blurs).

**Negativtest 2 (AK 11, Schranke):** `node video/team-admin-tour/record.mjs en` mit `VIDEO_BASE_URL=http://localhost:3000` (Prod-Port), `:3501`, `http://192.168.1.5:3500`, `https://pundo.cy` und `VIDEO_BACKEND_URL=http://localhost:8000` → jeweils Exit 1 mit Meldung, die Port/URL nennt (`Recording only against the test instance 3500/8500 - got frontend "…"`); `.cache/en/rec/` unverändert (Marker-Datei und Änderungszeit bleiben).

**Sichtprüfung der Frames** (2026-10-19, alle Szenen): QA-Frames `out/frames/en/*.png` (Szenenmitte), Kontaktbögen alle 3 s über die ganze Laufzeit (6 Bögen, 640 px je Bild) und Vollbild-Frames an den kritischen Stellen (unscharfe Shops-, Produkt-, Kategorie- und CRM-Liste). Auf keinem Frame sind echte Shop-, Owner- oder Kontaktdaten, echte E-Mail-Adressen oder ein Passwort lesbar. Einschränkung: Zwischenzustände zwischen zwei Kontaktbogen-Frames (< 3 s) wurden nicht einzeln gesichtet; die Zeilen sind dort durch die Reihenfolge Freeze → Blur → Resume nie unmaskiert im Bild. **Vor jedem Re-Rec die Sichtprüfung wiederholen.**

R7 („nicht gelistet“ ist kein Zugriffsschutz): Im Video erscheinen nur `localhost:3500`, `@pundo-e2e.io`-Adressen und Demo-Daten; keine Hetzner-Pfade, Keys oder Prod-Mails.

## Layout-Befunde und Feinjustierung (Pilot)
Startwerte aus der Architektur wurden nach den ersten QA-Frames geändert (`brand.yml › formats.desktop`, nur dieses Format):
1. **Untertitel verdeckten den unteren Fensterrand** (Sidebar-Einträge „CRM“/„Help“ waren überdeckt). Fenster jetzt 1344×756 (vorher 1536×864), Oberkante 112, Unterkante 912; Untertitel-Unterkante bei y 1050. Auch ein zweizeiliger Untertitel (136 px) beginnt bei y 914. Unit-Test `test_desktop_window_fits_canvas_and_subtitles` sichert das ab.
2. **Untertitel-Cues:** `subtitle_max_chars` 48 → 60, damit ganze Sätze in einem Cue bleiben (vorher Wort-Waisen wie „decides.“). EN-SRT: 28 statt 33 Cues.
3. **Callout-Band** und Logo näher an die Fensterkante gerückt (Band y 20, Logo x 1462).
4. **Neu `window_highlight`** (Szenenfeld, nur Desktop): akzentfarbener Rahmen um die Adresszeile; die Szene „Test or live?“ lenkt damit den Blick auf `localhost:3500`.
5. **Adresszeile zeigt jetzt auch den Host** (`localhost:3500/admin/…`), sonst wäre die Test-vs-Live-Aussage im Bild nicht nachvollziehbar.
6. **Zeiger** startet in Bildmitte, Klick-Ripple und Hover sind sichtbar; `outline` auf `<tr>` rendert nicht, deshalb wird die Tabelle umrahmt.

Offene Schwächen (ehrlich):
- **Schrift klein:** Bei 1440×810-Viewport im 1344-px-Fenster sind Menü- und Tabellentext ca. 12–13 px im 1080p-Bild. Auf Vollbild gut lesbar, auf dem Handy-Bildschirm knapp. Ein kleinerer Viewport (1280×720) würde den Text vergrößern, schneidet aber „Help“ aus der Sidebar ab (die Sidebar braucht ca. 790 px Höhe), deshalb nicht gemacht.
- **Adresszeile je Szene statisch:** In „Products and categories“ steht `…/admin/products`, auch wenn kurz Categories gezeigt wird; in „Claims and reviews“ steht `…/admin/claims` auch bei den Reviews; in „Help“ `…/admin/help` auch bei der Themenseite.
- **Help-Karten zeigen „Video coming soon“**, weil noch keine Video-ID eingetragen ist. Nach dem Upload zeigt die Seite „Video“; das Video muss deshalb nicht neu aufgenommen werden, es zeigt nur den Zustand zur Aufnahmezeit.
- **Ein Satz zu zwei Zeilen:** Die Zwei-Zeilen-Untertitel liegen knapp (2 px) unter dem Fenster.
- **Aussprache nicht gehört:** „3500“ wird vom TTS vermutlich als „thirty-five hundred“ gesprochen; „CRM“/„API“ buchstabiert. Vor der Freigabe anhören.
- Die EL-SRT hat 45 Cues (Griechisch ist länger, Zeilen max. 2×42 Zeichen); das Timing folgt dem EN-Satz (R10), vor Veröffentlichung in YouTube sichten.

## Abweichungen vom Auftrag / Plan
- Die Login-Szene fehlt bewusst (Kamera startet nach dem API-Login), der Sprechtext sagt aber „you sign in with your own admin account“.
- „Moderation“ aus dem Auftrag ist als „Reviews“ (Moderationsliste) zusammen mit Claims in einer Szene.
- Die Szene „Hilfe“ nutzt die ausgelieferte Hilfe-Seite von Teil A (Liste, dann Thema „Admin tour“).
