# Shop-Owner Portal – Testanleitung für Keyuser

Diese Anleitung beschreibt, wie das Shop-Owner-Portal vollständig manuell getestet werden kann. Sie richtet sich an Keyuser, die keine technischen Kenntnisse benötigen, aber das System gründlich kennen und systematisch prüfen sollen.

**Ziel:** Jede Funktion einmal durchspielen und das erwartete Ergebnis prüfen.  
**Voraussetzung:** Zugang zur Testumgebung (URL vom Entwicklerteam erhalten). Kein Produktivzugang nötig.

---

## Vor dem Test

- Browser: Chrome oder Firefox (aktuellste Version)
- Keine App-Installation nötig — alles läuft im Browser
- Notizblock bereithalten, um Abweichungen zu protokollieren
- Screenshots: Browser-Funktion `Strg+Shift+S` (Windows) oder `Cmd+Shift+4` (Mac)

---

## Bereich 1 – Registrierung & Login

### 1.1 Registrierung (neues Konto anlegen)

**Schritte:**
1. Testumgebungs-URL aufrufen, z. B. `http://localhost:3000/shop-admin/register`
2. Formular ausfüllen:
   - Shop-Name: `Testshop Olivenöl`
   - E-Mail: eine gültige Test-E-Mail-Adresse
   - Passwort: mindestens 8 Zeichen
3. Auf **Registrieren** klicken

**Erwartetes Ergebnis:**  
- Seite zeigt Hinweis: „Bitte bestätige deine E-Mail-Adresse"
- Eine Bestätigungs-E-Mail kommt an (in der Testumgebung ggf. im Postfach des Backends einsehbar)

---

### 1.2 E-Mail-Bestätigung

**Schritte:**
1. Bestätigungslink in der E-Mail anklicken

**Erwartetes Ergebnis:**  
- Seite zeigt: „Dein Konto wartet auf Freischaltung durch das Pundo-Team"
- Noch kein Zugang zum Portal

---

### 1.3 Admin-Freischaltung (wird vom Pundo-Team durchgeführt)

Nach der Freischaltung erhält der Shop-Betreiber eine Benachrichtigung. In der Testumgebung kann die Freischaltung direkt vom Testteam ausgelöst werden.

---

### 1.4 Login

**Schritte:**
1. URL aufrufen: `/shop-admin/login`
2. E-Mail und Passwort eingeben
3. Auf **Anmelden** klicken

**Erwartetes Ergebnis:**  
- Weiterleitung zu `/shop-admin/dashboard`
- Willkommens-Nachricht mit dem Shop-Namen sichtbar
- Navigationsleiste links (oder oben auf Mobilgeräten) mit allen Menüpunkten

---

### 1.5 Fehlerhafter Login

**Schritte:**
1. URL aufrufen: `/shop-admin/login`
2. Falsche E-Mail oder falsches Passwort eingeben
3. Auf **Anmelden** klicken

**Erwartetes Ergebnis:**  
- Seite bleibt bei `/shop-admin/login`
- Fehlermeldung erscheint (z. B. „Ungültige Zugangsdaten")
- Kein Zugang zum Portal

---

### 1.6 Direktzugriff ohne Login

**Schritte:**
1. Im Browser `/shop-admin/dashboard` direkt aufrufen (ohne eingeloggt zu sein)

**Erwartetes Ergebnis:**  
- Automatische Weiterleitung zu `/shop-admin/login`
- Kein Inhalt des Portals sichtbar

---

## Bereich 2 – Dashboard

**Navigation:** Nach dem Login automatisch, oder Klick auf „Dashboard" in der Seitenleiste

**Was zu prüfen ist:**

| Prüfpunkt | Erwartetes Ergebnis |
|---|---|
| Seitenüberschrift | „Dashboard" oder „Willkommen" sichtbar |
| Shop-Name | Eigener Shop-Name wird angezeigt |
| Schnellzugriff-Kacheln | 6 Kacheln sichtbar: Profil, Öffnungszeiten, Produkte, Angebote, Import, API-Keys |
| Klick auf eine Kachel | Navigiert zur entsprechenden Unterseite |
| Keine Fehler | Keine roten Fehlermeldungen, kein weißer Ladebildschirm |

---

## Bereich 3 – Profil (Shop-Daten pflegen)

**Navigation:** Seitenleiste → **Profil**  
**URL:** `/shop-admin/profile`

### 3.1 Shop-Daten anzeigen

**Erwartetes Ergebnis:**  
- Formular mit aktuellen Shop-Daten vorausgefüllt
- Felder: Shop-Name, Beschreibung, Logo-URL, Adresse
- Abschnitt „Gesprochene Sprachen" mit Sprach-Chips (z. B. EN, DE, EL, RU, AR, HE)

---

### 3.2 Shop-Daten ändern und speichern

**Schritte:**
1. Shop-Name ändern, z. B. auf `Testshop Olivenöl (bearbeitet)`
2. Beschreibung ergänzen, z. B. `Frisches Olivenöl aus Zypern`
3. Adresse eintragen, z. B. `Larnaca Hauptstraße 12`
4. Auf **Speichern** klicken

**Erwartetes Ergebnis:**  
- Grüne Erfolgsmeldung erscheint kurz (Toast: „Gespeichert")
- Seite bleibt geöffnet (kein Redirect)
- Bei erneutem Laden der Seite: Änderungen sind noch vorhanden

---

### 3.3 Gesprochene Sprachen setzen

**Schritte:**
1. Im Abschnitt „Gesprochene Sprachen" auf die Sprach-Chips klicken (z. B. EN, DE, EL auswählen)
2. Auf **Speichern** klicken

**Erwartetes Ergebnis:**  
- Ausgewählte Sprachen sind optisch hervorgehoben
- Toast „Gespeichert" erscheint

---

### 3.4 Logo-URL (optional)

**Schritte:**
1. Eine gültige Bild-URL eintragen (z. B. `https://example.com/logo.png`)
2. Speichern

**Erwartetes Ergebnis:**  
- Kein Fehler beim Speichern

---

## Bereich 4 – Öffnungszeiten

**Navigation:** Seitenleiste → **Öffnungszeiten**  
**URL:** `/shop-admin/hours`

### 4.1 Öffnungszeiten anzeigen

**Erwartetes Ergebnis:**  
- 7 Zeilen für Montag bis Sonntag
- Jede Zeile hat: Checkbox „Geschlossen", Öffnungszeit, Schließzeit
- Vorausgefüllte Zeiten (z. B. 09:00 – 18:00)

---

### 4.2 Öffnungszeiten ändern

**Schritte:**
1. Bei Montag die Öffnungszeit auf `08:00` setzen
2. Bei Sonntag die Checkbox „Geschlossen" aktivieren
3. Auf **Speichern** klicken

**Erwartetes Ergebnis:**  
- Toast „Gespeichert" erscheint
- Bei erneutem Laden: Änderungen bleiben erhalten (Sonntag als „geschlossen" markiert)

---

### 4.3 Alle Tage offen setzen

**Schritte:**
1. Bei allen 7 Tagen die „Geschlossen"-Checkbox deaktivieren
2. Speichern

**Erwartetes Ergebnis:**  
- Kein Fehler, Toast erscheint

---

## Bereich 5 – Produkte

**Navigation:** Seitenleiste → **Produkte**  
**URL:** `/shop-admin/products`

### 5.1 Produktliste anzeigen

**Erwartetes Ergebnis:**  
- Tabelle oder Karten-Ansicht mit vorhandenen Produkten (oder leer, wenn noch keine angelegt)
- Button „Neues Produkt" sichtbar

---

### 5.2 Neues Produkt anlegen

**Schritte:**
1. Auf **Neues Produkt** klicken
2. Formular ausfüllen:
   - Name: `E2E Testprodukt Olivenöl`
   - Kategorie: aus der Dropdown-Liste wählen
   - Preis: `5.90`
   - Währung: `EUR`
   - Einheit: `1L`
   - Verfügbarkeit: aktiviert (Haken gesetzt)
3. Auf **Speichern** klicken

**Erwartetes Ergebnis:**  
- Weiterleitung zurück zur Produktliste
- Neues Produkt erscheint in der Liste

---

### 5.3 Produkt bearbeiten

**Schritte:**
1. In der Produktliste auf **Bearbeiten** beim Testprodukt klicken
2. Namen ändern: `E2E Testprodukt Olivenöl (bearbeitet)`
3. Speichern

**Erwartetes Ergebnis:**  
- Weiterleitung zurück zur Produktliste
- Geänderter Name ist sichtbar

---

### 5.4 Produkt löschen

**Schritte:**
1. In der Produktliste auf **Löschen** beim Testprodukt klicken
2. Sicherheitsdialog erscheint (Bestätigen / Abbrechen)
3. Auf **Bestätigen** klicken

**Erwartetes Ergebnis:**  
- Produkt verschwindet aus der Liste
- Kein Fehler, kein Seitenreload-Fehler

> **Hinweis:** Ein Klick auf „Abbrechen" darf das Produkt nicht löschen — dies ebenfalls prüfen.

---

## Bereich 6 – Angebote

**Navigation:** Seitenleiste → **Angebote**  
**URL:** `/shop-admin/offers`

### 6.1 Angebotsliste anzeigen

**Erwartetes Ergebnis:**  
- Zwei Tabs sichtbar: **Aktiv** und **Abgelaufen/Archiviert**
- Aktiv-Tab ist standardmäßig geöffnet

---

### 6.2 Neues Angebot anlegen

**Schritte:**
1. Auf **Neues Angebot** klicken
2. Formular ausfüllen:
   - Titel: `E2E Testangebot`
   - Produkt: aus der Liste wählen (ein Produkt muss vorhanden sein, s. Bereich 5)
   - Gültig von: heutiges Datum
   - Gültig bis: Datum in 30 Tagen
   - Preis-Typ: z. B. `Fixpreis`
   - Preis: `4.50`
3. Speichern

**Erwartetes Ergebnis:**  
- Weiterleitung zur Angebotsliste
- Angebot erscheint im Tab **Aktiv**

---

### 6.3 Angebot archivieren

**Schritte:**
1. Beim Testangebot auf **Archivieren** klicken
2. Bestätigungsdialog bestätigen

**Erwartetes Ergebnis:**  
- Angebot verschwindet aus Tab **Aktiv**
- Angebot erscheint im Tab **Abgelaufen/Archiviert**

---

### 6.4 Angebot bearbeiten

**Schritte:**
1. Bei einem aktiven Angebot auf **Bearbeiten** klicken
2. Titel ändern
3. Speichern

**Erwartetes Ergebnis:**  
- Weiterleitung zur Angebotsliste
- Geänderter Titel sichtbar

---

## Bereich 7 – Import

**Navigation:** Seitenleiste → **Import**  
**URL:** `/shop-admin/import`

### 7.1 Import-Seite aufrufen

**Erwartetes Ergebnis:**  
- Zwei Abschnitte sichtbar: **Datei-Upload** und **Google Sheets**
- Aktueller Sync-Status (Zeitstempel oder „Noch kein Import")

---

### 7.2 Excel/CSV-Datei hochladen

**Schritte:**
1. Eine Testdatei vorbereiten (`.xlsx` oder `.csv`) mit den Spalten:  
   `name`, `price`, `currency`, `unit`, `category`, `available`
2. Datei per Drag & Drop oder „Datei auswählen" hochladen
3. Import starten

**Erwartetes Ergebnis:**  
- Fortschrittsanzeige erscheint
- Ergebnis: Anzahl importierter Produkte + ggf. Fehler pro Zeile
- Bei Fehler in einer Zeile: verständliche Fehlermeldung, andere Zeilen trotzdem importiert

---

### 7.3 Google Sheets Sync einrichten

**Schritte:**
1. Eine öffentlich zugängliche Google-Sheets-URL einfügen
2. Auf **Speichern** oder **Sync starten** klicken

**Erwartetes Ergebnis:**  
- URL wird gespeichert
- Sync-Status zeigt: zuletzt synchronisiert (Datum/Uhrzeit) und OK oder Fehlermeldung

---

### 7.4 Manueller Re-Sync

**Schritte:**
1. Auf **Jetzt synchronisieren** klicken

**Erwartetes Ergebnis:**  
- Kurze Ladeanzeige
- Sync-Status aktualisiert sich mit neuem Zeitstempel

---

## Bereich 8 – API-Keys

**Navigation:** Seitenleiste → **API-Keys**  
**URL:** `/shop-admin/api-keys`

### 8.1 API-Key-Liste anzeigen

**Erwartetes Ergebnis:**  
- Tabelle mit vorhandenen Keys (Name, Erstellungsdatum, Scope)
- Button „Neuen API-Key anlegen"
- Key-Wert selbst ist **nicht** sichtbar (nur der Name)

---

### 8.2 Neuen API-Key anlegen

**Schritte:**
1. Auf **Neuen API-Key anlegen** klicken
2. Name eingeben: `E2E Test Key`
3. Scope wählen: z. B. `Lesen`
4. Bestätigen

**Erwartetes Ergebnis:**  
- Key-Wert wird **einmalig** im Klartext angezeigt (Hinweis: „Nur einmal sichtbar – jetzt kopieren")
- Key ist mindestens 10 Zeichen lang
- Nach dem Schließen des Dialogs: Key taucht in der Liste auf (aber Key-Wert nicht mehr sichtbar)

---

### 8.3 API-Key löschen

**Schritte:**
1. Beim Testkey auf **Löschen** klicken
2. Bestätigungsdialog bestätigen

**Erwartetes Ergebnis:**  
- Key verschwindet aus der Liste
- Kein Fehler

---

## Bereich 9 – Logout

**Schritte:**
1. In der Navigationsleiste auf **Abmelden** klicken

**Erwartetes Ergebnis:**  
- Weiterleitung zu `/shop-admin/login`
- Bei erneutem Aufruf von `/shop-admin/dashboard` ohne erneutes Login: Redirect zur Login-Seite

---

## Bereich 10 – Responsive / Mobilansicht

Das Portal soll auch auf Smartphones und Tablets bedienbar sein.

**Test auf Mobilgerät oder mit Browser-Devtools (F12 → Geräte-Emulation, z. B. iPhone 14):**

| Prüfpunkt | Erwartetes Ergebnis |
|---|---|
| Navigationsleiste | Einklappbar oder als Hamburger-Menü |
| Formulare | Felder nehmen volle Breite ein, Touch-freundliche Größe |
| Kein horizontaler Scroll | Kein Inhalt ragt über den Bildschirmrand hinaus |
| Buttons | Mindestens 44px hoch (gut tippbar) |

---

## Bereich 11 – Sprache des Portals

Das Portal erkennt die Browsersprache oder eine manuell gewählte Sprache.

**Schritte:**
1. Sprachwechsler (falls vorhanden) auf **Deutsch** setzen
2. Prüfen, ob alle Beschriftungen auf Deutsch erscheinen
3. Auf **Englisch** wechseln, erneut prüfen

**Erwartetes Ergebnis:**  
- Alle Menüpunkte, Buttons und Fehlermeldungen wechseln die Sprache
- Für Arabisch (`ar`) oder Hebräisch (`he`): Layout spiegelt sich (Text läuft von rechts nach links)

---

## Fehlerprotokoll-Vorlage

Wenn etwas nicht wie erwartet funktioniert, bitte nach diesem Schema dokumentieren:

```
Datum:         2026-04-10
Tester:        [Name]
Bereich:       [z. B. Bereich 5 – Produkte]
Test-Schritt:  [z. B. 5.4 Produkt löschen]
Erwartetes Ergebnis: Produkt verschwindet aus der Liste
Tatsächliches Ergebnis: Fehlermeldung erscheint / Produkt bleibt in der Liste
Browser:       Chrome 123
Screenshot:    [Datei anhängen]
```

---

## Checkliste Gesamttest

| Bereich | Getestet | OK | Fehler |
|---|---|---|---|
| 1.1 Registrierung | ☐ | ☐ | ☐ |
| 1.4 Login korrekt | ☐ | ☐ | ☐ |
| 1.5 Login falsch | ☐ | ☐ | ☐ |
| 1.6 Direktzugriff ohne Login | ☐ | ☐ | ☐ |
| 2 Dashboard | ☐ | ☐ | ☐ |
| 3.2 Profil speichern | ☐ | ☐ | ☐ |
| 3.3 Sprachen setzen | ☐ | ☐ | ☐ |
| 4.2 Öffnungszeiten ändern | ☐ | ☐ | ☐ |
| 5.2 Produkt anlegen | ☐ | ☐ | ☐ |
| 5.3 Produkt bearbeiten | ☐ | ☐ | ☐ |
| 5.4 Produkt löschen + Abbrechen | ☐ | ☐ | ☐ |
| 6.2 Angebot anlegen | ☐ | ☐ | ☐ |
| 6.3 Angebot archivieren | ☐ | ☐ | ☐ |
| 7.2 Datei-Upload | ☐ | ☐ | ☐ |
| 7.3 Google Sheets Sync | ☐ | ☐ | ☐ |
| 8.2 API-Key anlegen (Wert notiert?) | ☐ | ☐ | ☐ |
| 8.3 API-Key löschen | ☐ | ☐ | ☐ |
| 9 Logout | ☐ | ☐ | ☐ |
| 10 Mobilansicht | ☐ | ☐ | ☐ |
| 11 Sprachwechsel | ☐ | ☐ | ☐ |
