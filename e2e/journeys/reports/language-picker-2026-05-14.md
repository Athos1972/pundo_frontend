## Journey: Language Picker One-Tap-Apply (F6310) — PASS
Datum: 2026-05-14 00:30 UTC  
SHA: 819f4817e4ff44bb2454c9a3a46abdf38fdcabed

### Kontext
Erster vollständiger E2E-Lauf nach One-Tap-Apply-Refactoring (Commit 108b763). Smoketest-Fix für "header img present but not visible" (SMOK-1).

### SMOK-1 Root-Cause Analysis
**Symptom:** Production smoketest `home-anon` (pundo.cy + naidivse.cy) reported "Selector header img is present but not visible".

**Ursache:** `LanguagePickerOverlay` zeigt sich beim ersten Besuch ohne `app_lang`-Cookie. Die Overlay hat `z-[60] bg-black/60 fixed inset-0` — sie bedeckt den gesamten Viewport. Das macht `header img` visuell versteckt, obwohl es im DOM vorhanden ist. Playwright's `isVisible()` gibt `false` zurück für Elemente, die von einem anderen Element überlagert werden.

**Fix:** `smoketests/src/lang-setup.ts` setzt `app_lang`-Cookie vor jeder Navigation (schon in place). Commit 108b763 fügt `dismiss()` als Defense-in-Depth hinzu: Overlay wird explizit geschlossen bevor `router.refresh()`/`window.location.reload()` ausgeführt wird.

**Status:** RESOLVED — Production smoketest 2026-05-13 19:16 UTC: 42 PASS, 0 FAIL.

### Schritt-für-Schritt-Protokoll (14 Tests)

| # | Test | Erwartet | Status |
|---|---|---|---|
| AC1 | Fresh visitor sieht Overlay | `role=dialog` sichtbar | PASS |
| AC2 | Returning visitor (Cookie) sieht kein Overlay | kein Dialog | PASS |
| AC3 | Browser-Lang ru-RU → Русский vorausgewählt | `aria-checked=true` auf RU-Radio | PASS |
| AC4 | Browser-Lang fr-FR → English fallback | `aria-checked=true` auf EN-Radio | PASS |
| AC5 | One-Tap Deutsch setzt Cookie und schließt Overlay | `app_lang=de` Cookie gesetzt | PASS |
| AC6 | Nach One-Tap Deutsch: `html[lang]=de` | html lang-Attribut korrekt | PASS |
| AC7 | Arabisch wählen → `html[dir]=rtl` | RTL-Attribut gesetzt | PASS |
| AC9 | 6 Native-Script-Namen sichtbar | English, Deutsch, Русский, Ελληνικά, العربية, עברית | PASS |
| AC10 | SSR-HTML enthält kein Dialog (Hydration-safe) | `role=dialog` count = 0 ohne JS | PASS |
| AC11 | ARIA: `role=dialog, aria-modal=true, aria-labelledby` | Alle Attribute korrekt | PASS |
| AC-T2 | Same-Lang One-Tap: kein Hard-Reload (router.refresh()) | Keine Navigation, Dialog verschwindet | PASS |
| AC-T3 | Kein Confirm/Continue-Button im Dialog | 0 confirm-Buttons | PASS |
| ESC | ESC schließt Overlay nicht (not skippable) | Dialog bleibt sichtbar | PASS |
| Backdrop | Backdrop-Click schließt nicht (not skippable) | Dialog bleibt sichtbar | PASS |

### Aufräumen
_Kein Fixture-Cleanup nötig — alle Tests verwenden ephemere Browser-Contexts._
