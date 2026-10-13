# Journey: Seniorenbetreuung in der Kundensuche (F2970 Welle 4)

Spec: `consumer-service-eldercare-w4.spec.ts` (nur 3500/8500, read-only, keine Fixtures; Voraussetzung: W4-Seed auf pundo_test).

1. Kunde sucht in en/de/el/ru/he/ar nach einem Seniorenbetreuungs-Begriff -> erste Service-Karte ist "Seniorenbetreuung" (px-eldercare), 0 Anbieter -> Hinweis "Kostenlos eintragen" sichtbar.
2. Medizinische Begriffe (Krankenpflege, nurse, medsestra ...) fuehren nicht auf diese Karte als Top-1.
3. he/ar bei 390 px: dir=rtl, Karte sichtbar, kein horizontaler Overflow.

Letzter Lauf 2026-10-13: 9/9 gruen.
