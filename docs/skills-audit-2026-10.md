# Skills- & Subagent-Audit für die Claude-5-Familie

Stand: 2026-10-03 · Read-only-Audit, nichts geändert außer dieser Datei.
Zielmodelle: Opus 5.5 (`claude-opus-5-5`, $4/$20 pro MTok), Sonnet 5.5 (`claude-sonnet-5-5`, $2/$10), Fable 5.1 (`claude-fable-5-1`, $10/$50), Haiku 4.5 (`claude-haiku-4-5`, $1/$5). Preise laut aktueller Claude-API-Referenz (Cache-Stand 2026-09-25).

Geprüft (alle vollständig gelesen):
- `~/.claude/agents/{architect,coder,designer,e2e-tester}.md`
- `~/.claude/skills/{coordinator,designer,inbox-triage,pundo-cleanup}/SKILL.md`, `log-researcher/` (enthält nur `.last_scan` vom 2026-04-25, keine SKILL.md), `e2e-tester/` (enthält nur `.last_run`), `synced/*` (user-eigene: `pipeline-log-analyst`, `pundo-guide-author`, `bb-quick-capture`; die übrigen sind von Anthropic verwaltet und werden hier nicht bewertet)
- `pundo_frontend/.claude/skills/{architect,coder,designer,e2e-tester,frontend-designer}/SKILL.md` + `.last_run`, `.journey_backlog`
- `pundo_main_backend/.claude/skills/{architect,coder,designer,e2e-tester,export-content,frontend-designer}/SKILL.md`
- Kontext: CLAUDE.md/AGENTS.md beider Repos, `~/.claude/CLAUDE.md`, `~/.claude/settings.json`, Repo-`.claude/settings.json`

Legende: **P1** = falsches Verhalten oder Sicherheits-/Datenrisiko, zuerst beheben · **P2** = schlechtere Ergebnisse oder unnötige Kosten · **P3** = Hygiene.
„(unsicher)“ markiert Aussagen, die ich nicht direkt im System verifizieren konnte.

---

## (a) Executive Summary: die 10 wichtigsten Änderungen, nach Wirkung sortiert

1. **Ein Spec-Pfad, nicht zwei (P1).** `AGENTS.md`/`CLAUDE.md` in **beiden** Repos sagen noch „Jeder Schritt schreibt in `specs/<feature-slug>/`“. Alle Agents und Skills sagen „Vault, niemals Repo-`specs/`“. Das hat schon Folgen: `pundo_frontend/specs/` hat neue Ordner vom 2026-06-04 bekommen (`2026-06-04-homepage-redesign` u. a.). → Den Abschnitt in beiden AGENTS/CLAUDE.md auf den Vault-Pfad umschreiben. Wenn das erledigt ist, können alle verstreuten „Never write to repo specs/“-Regeln entfallen.
2. **Gefährliche Testschritte entfernen (P1).** Backend-`e2e-tester` I-06 führt `alembic downgrade base` gegen die DB aus, und die ist am Studio `pundo_test` mit Prod-Daten. Das löscht alle Tabellen. Frontend-`e2e-tester` „Phase 5: Produktions-Migration“ macht `alembic upgrade head` und nennt das „Produktions-DB“. Am Studio zeigt `DATABASE_URL` auf `pundo_test`, und auf Hetzner erledigt das der Deploy-Hook. → Beide Abschnitte löschen.
3. **Commit- und Push-Politik vereinheitlichen (P1).** Heute gibt es fünf verschiedene Aussagen:
   - Agent `coder`: „Commit in small, logical chunks“ und „direkt auf `main`“
   - Repo-Skills: „Kein automatisches Commit“
   - `coordinator`: „NIEMALS committen“
   - Backend-CLAUDE.md: „Branches `feat/<slug>`, PR-Target `develop` (niemals direkt in main)“
   - Memory: „direkt auf main“

   Dazu kommt: Ein Push auf `main` deployt per Webhook auf Prod, und die Frontend-Settings erlauben `git push origin:*`. → Eine Regel festlegen (Vorschlag: Agents committen nie, Bernhard gibt frei) und sie an genau einer Stelle festhalten, nämlich in der User-CLAUDE.md.
4. **Rollen entdoppeln (P1/P2).** Der Designer existiert viermal (Agent, User-Skill, FE-Skill, BE-Skill), Architect/Coder/E2E-Tester je dreimal. Die Kette über Agent-Tool oder `/coordinator` nutzt die **User-Agents**. Die kennen das repo-spezifische Wissen nicht: Journey-Katalog, F8950-Gate, Clean Boundary, Tooltip-Pflicht. Der manuelle Weg `/coder` nutzt dagegen die **Repo-Skills** mit anderen Regeln. Vorschlag in Abschnitt (c).
5. **Rückfragen in autonomen Läufen streichen (P1).** Designer-Agent „Ask the user to confirm“, Repo-Skills „Bestätigen? (j/n) — Warte auf Antwort“, E2E-Tester „Tester fragt User: test-fix/finding?“. Ein Subagent kann nicht mit dem User sprechen. Er bleibt dann stehen oder erfindet die Antwort. → Im Chain-Modus Vorschläge als `proposed` in die Spec schreiben und die Entscheidung im Handoff an den Menschen bündeln. Der Designer, der echten Dialog braucht, sollte als Skill im Hauptthread laufen.
6. **Model-Pins ersetzen (P2).** `claude-sonnet-4-6` (inbox-triage, pundo-cleanup), `claude-opus-4-6` (BE-designer) und `claude-sonnet-5` (alle 7 Repo-Skills außer Designer) sind Vorgänger-Generationen. Sonnet 5 kostet zwar gleich viel, ist aber schwächer als Sonnet 5.5, und Sonnet 4.6 ist sogar teurer ($3/$15). → Überall Aliase verwenden (`opus`/`sonnet`/`haiku`/`inherit`), damit nichts mehr veraltet. Zuordnung in (d).
7. **Veraltete Fakten korrigieren (P1/P2).** Belege jeweils in Tabelle (b):
   - `npm run dev` existiert nicht mehr, nur noch `dev:test`.
   - `npm run test` existiert nicht, richtig ist `npx vitest run`.
   - Next.js steht als „16.2.2“ drin, installiert ist 16.2.10.
   - Der FE-Architect-Modulbaum ist komplett veraltet: Routen liegen jetzt unter `src/app/(customer)/[lang]/`, Shops unter `[slug]` statt `[id]`.
   - Der BE-Architect nennt `models/product.py` und `offer.py`. Die gibt es nicht mehr, heute sind es `item.py`, `shop_listing.py` und `unified_offer.py`.
   - Die RTL-Regel „kommt vom Backend“ stimmt nicht: Das Frontend berechnet `dir` per `isRTL(lang)` aus `src/lib/lang.ts`.
8. **Klartext-DB-Passwort entfernen (P1).** `pundo_main_backend/.claude/skills/coder/SKILL.md` enthält das Postgres-Passwort fünfmal. Die Datei ist git-getrackt (Repo privat). Das widerspricht der eigenen Regel „NIEMALS Secrets hardcoden“. → Durch `$DATABASE_URL_TEST` aus `.env` ersetzen und das Passwort rotieren.
9. **Den FE-`e2e-tester` auf etwa 150 Zeilen kürzen, Rest in Referenzdateien (P2).** Heute: 1252 Zeilen, ca. 47 KB, also rund 12–14k Tokens pro Aufruf. Darin stehen zwei „Phase 3“ und zwei „Phase 4.5“, Setup-Anleitungen für längst installierte Tools und Code-Beispiele mit falschen Ports. Plan in (b)/(c).
10. **Prompt-Stil an Claude-5-Modelle anpassen (P2).**
    - „Use PROACTIVELY immediately“ aus allen Descriptions entfernen. Das löst unnötige Auto-Delegation aus.
    - ALL-CAPS-Häufungen wie `PFLICHT`/`NIEMALS`/`KRITISCH` abbauen: FE-e2e 14×, BE-e2e 10×, BE-coder 8×. Die echten Sicherheitsregeln bleiben, aber ruhig formuliert und mit Begründung.
    - STEP-1…n-Choreografien für Ermessensaufgaben durch Ziel + Verifikation ersetzen.
    - Die Leitlinie dahinter: Prompts für frühere Modelle sind für die 5er-Modelle oft zu vorschreibend und verschlechtern das Ergebnis.

---

## (b) Befunde pro Datei

### User-Agents (`~/.claude/agents/`)

| Datei | Problem | Konkrete Änderung | Prio |
|---|---|---|---|
| alle 4 | Description: „Use PROACTIVELY immediately after designer writes 01-design.md…“ Bei 5er-Modellen führt das zu Über-Triggern: Der Hauptthread spawnt den Architect, sobald irgendwo eine 01-design.md auftaucht. | Neutral formulieren: „Erstellt 02-architecture.md aus einer vorhandenen 01-design.md … Nicht für Ad-hoc-Architekturfragen.“ Neue Descriptions in (d). | P2 |
| architect.md:11,20 | Bug-Pfad `<FG>/Bugs/B<id>.md`. pundo-cleanup sagt dagegen, Bugs liegen zentral in `00 Überblick/__ Bugs & Hotfixes/`, und der F8950-Register liegt in `FG8 …/Bugs/B<id>/B<id>.md`. Im Vault existieren tatsächlich alle drei Varianten. | Einen Bug-Ort als kanonisch festlegen (Vorschlag: zentral, mit `specs/` als Unterordner von `B<id>/`). In Conventions.md festhalten und dort verlinken statt in jeder Datei zu wiederholen. | P1 |
| architect.md:34-50 | „Du MUSST vor deiner eigenen Handoff-Zeile…“ – Cross-Repo-Trigger. Widerspricht FE-architect-Skill:143 („automatisch den Backend-Architect anstoßen“) und dem User-designer-Skill:72. Der coordinator:105 sagt: „NIEMALS der Frontend-Architect allein“. | Eine Regel: Der Architect meldet Backend-Bedarf als Marker, den Start übernimmt der Coordinator oder der Mensch. Den Gegenteil-Text in den Skills streichen. | P1 |
| architect.md:53 / coder.md:37 / designer.md:42 / e2e-tester.md:143 | „Never write to repo `specs/` folders — deprecated as of 2026-04-25“. Das ist eine Datums-Archäologie, und vor allem widerspricht es AGENTS.md. | AGENTS.md korrigieren (Punkt 1). Danach reicht ein Satz in der Output-Sektion. | P2 |
| architect.md:57 | „surface them and stop“ ist für einen Subagent korrekt, aber nirgends ist festgelegt, wohin. | „Offene blockierende Fragen in 02-architecture.md unter ‚Blocker‘ und im Handoff nennen, dann enden.“ | P3 |
| coder.md:5 | `model: sonnet`: Alias ok, er zeigt jetzt auf Sonnet 5.5. | Behalten (Begründung in d). | – |
| coder.md:34,40 | „Immer direkt auf `main` arbeiten“ + „Commit in small, logical chunks … `feat(invoice): T3`“. Widerspricht Repo-Skills, Coordinator und BE-CLAUDE.md (develop/feat-Branches). Mit dem Push-Webhook entsteht ein Prod-Deploy-Risiko. | Commit-Zeilen streichen. Stattdessen: „Nicht committen oder pushen. Commit-Vorschlag mit Task-Nummern in 03-implementation.md.“ BE-CLAUDE.md-Branchregel angleichen oder als veraltet entfernen. | P1 |
| coder.md:17 | `hybrid_scraper` als Ziel-Repo. Gehört nicht zum Repo-Katalog der CLAUDE.md, der Coordinator kennt stattdessen llm-gateway und llm-workers. | Repo-Liste angleichen (Verweis auf den Repo-Katalog statt einer Liste). | P3 |
| coder.md:45-51 | Wertvolle Backend-Regeln (sync_tables, DEFERRABLE FK, psql ON_ERROR_STOP) liegen im generischen Agent, gelten aber nur für pundo_main_backend. | In das Backend-Playbook verschieben (siehe c). Inhalt behalten, das ist echtes Kontextwissen. | P2 |
| designer.md:4 | `tools: Read, Write, Glob, Grep`. Der FE-Designer-Skill verlangt CATALOG.md-Edits, der User-Skill verlangt das Umwandeln einer flachen Datei in einen Ordner (mv). Beides ist mit diesen Tools nicht oder nur destruktiv per Write möglich. | `Edit` ergänzen. Ordner-Umwandlung entweder streichen oder `Bash` ergänzen. | P2 |
| designer.md:25-28 | „Ask the user to confirm before writing“ ist im Subagent nicht möglich. | Designer als Skill im Hauptthread führen (c). Im Agent-Modus: „Vorschlag mit ⚠️ ANNAHME schreiben und im Handoff zur Bestätigung stellen.“ | P1 |
| designer.md:5 | `model: sonnet` für die Anforderungsklärung. Die Skills pinnen `opus`. Ungleich. | `inherit` (Skill im Hauptthread) bzw. `opus` (siehe d). | P2 |
| e2e-tester.md:4 | `tools` **ohne Edit**, soll aber `CATALOG.md`, Feature-`.md` und `_index.md` „append/edit, nie destruktiv“ pflegen. Mit nur `Write` muss die ganze Datei neu geschrieben werden, und genau das ist das Risiko für die Vault-Dateien. | `Edit` ergänzen. | P1 |
| e2e-tester.md:25-29 vs 147 | Verdict-Werte SHIP/FIX/ESCALATE, aber Regel 147 verlangt „verdict is BLOCKED“. | BLOCKED als Status pro Kriterium belassen, als Verdict auf ESCALATE abbilden, und das einmal erklären. | P2 |
| e2e-tester.md:92 | Test-Befehl `npm run test`: Dieses Script gibt es nicht in `package.json`. | `npx vitest run` / `npx playwright test`. | P1 |
| e2e-tester.md:101 | Lint `ruff check . && black --check . && mypy .` widerspricht dem BE-coder-Skill (nur ruff). | Einheitlich aus der BE-CLAUDE.md übernehmen (ruff + black + mypy) und nur dort pflegen. | P2 |
| e2e-tester.md:111-140 | Sync-Abschnitt sagt „Resettet `pundo_test`“, AGENTS.md dagegen „niemals automatisch löschen“. Beides stimmt, wenn man genau hinsieht: Der Sync ist ein bewusster, freigegebener Reset. Ohne diese Erklärung liest es sich aber als Widerspruch. Zudem enthält der Abschnitt E2E-Credentials im Klartext. | Einen Satz ergänzen: „Der Sync ersetzt pundo_test vollständig und ist deshalb nur bei dünnen Daten und nach Ankündigung zu nutzen.“ Credentials-Zeile durch einen Verweis auf die Fixture-Datei ersetzen. | P2 |
| e2e-tester.md:69-75 | „Catch-up-Check (Phase 9 Daueraufgabe)“ und „Repo-Docs-Sync (siehe Phase 8)“ verweisen auf Phasen eines alten Migrationsplans, die der Agent nicht kennt. | Phasen-Verweise streichen, die Aufgabe direkt benennen. | P3 |

### User-Skills (`~/.claude/skills/`)

| Datei | Problem | Konkrete Änderung | Prio |
|---|---|---|---|
| coordinator:9-10 | `tools:` ist kein gültiges Skill-Feld, gültig wäre `allowed-tools` (unsicher, wie das ignoriert wird). `model: sonnet` passt nicht: Der Coordinator macht die Cross-Repo-Konsistenzprüfung (2d, Envelope-Mismatch), also genau die anspruchsvollste Urteilsaufgabe, verbraucht dabei aber wenige Tokens. | `model: opus`, `tools` entfernen bzw. `allowed-tools`. Zusätzlich `disable-model-invocation: true`, weil der Skill nur explizit per `/coordinator` laufen soll. | P2 |
| coordinator:64-72 | Der Repo-Katalog verweist für llm-gateway/llm-workers auf `.claude/skills/architect|coder/SKILL.md`. **Diese Ordner existieren nicht.** Für das Backend steht dort „Spawne … SKILL.md“: Eine Skill-Datei lässt sich aber nicht als Agent spawnen. | Klar formulieren: „Spawne `Agent(subagent_type: architect)` mit Repo-Pfad und der Anweisung, `<repo>/.claude/playbooks/architect.md` zu lesen.“ (siehe c) | P1 |
| coordinator:13ff | Gutes, fachlich dichtes Dokument. Die Checklisten sind hier berechtigt, weil sie die Prüfung der Handoffs **sind**. Gut: die bekannten Fallen-Tabelle mit Begründungen. | Behalten. Nur das Banner-ASCII (Phase 5) auf eine schlichte Tabelle reduzieren, denn das Modell kopiert das Format sonst exakt. | P3 |
| coordinator:225-237 | Guardrails in Fettdruck/Caps, inhaltlich korrekt und sicherheitsrelevant. | Behalten, Ton normal, je ein „weil“. | P3 |
| designer (User-Skill) | Duplikat des Agents mit Abweichungen: Slug `invoice-pdf-export-20260423` vs. `YYYY-MM-DD-slug` (Agent/AGENTS.md/BE-designer). Handoff `specs/<slug>/01-design.md. Ready for /architect` (relativer Repo-Pfad!). `model: opus` vs. Agent `sonnet`. Behauptet: „Der Frontend-Architect triggert … automatisch den Backend-Architect“ – Widerspruch zum Coordinator. Tippfehler „ssumptions“. | Zusammenführen (c): **ein** Designer-Skill im User-Verzeichnis, der Agent wird gelöscht oder reduziert. Slug `YYYY-MM-DD-kebab`. Handoff mit vollem Vault-Pfad. | P1 |
| designer:3 | Description „Use PROACTIVELY when the user describes a new feature, a UI change, or a UX problem“: Damit triggert fast jede UI-Frage den Spec-Workflow. | „Use when the user asks for a feature spec / 01-design.md, or explicitly starts the spec workflow. Not for quick UI tweaks or bug fixes.“ | P2 |
| inbox-triage:9 | `model: claude-sonnet-4-6`: veraltet und teurer als Sonnet 5.5 ($3/$15 vs. $2/$10). | `model: sonnet` oder Feld weglassen. | P2 |
| inbox-triage:10-15 | `tools:` als Liste, siehe oben. Kein `Write`, obwohl neue Bug- und Stub-Dateien angelegt werden sollen (Schritt 4). | `allowed-tools` mit `Write`. | P2 |
| inbox-triage:5-6 vs 134 | Description: „ruft bei #pundo den /pundo-cleanup-Skill … auf“. Body: „**Nicht selbst** `/pundo-cleanup` aufrufen“. | Description an den Body anpassen („empfiehlt danach /pundo-cleanup“). | P1 |
| inbox-triage:36,61 | Bug-Ziel `00 Überblick/__ Bugs & Hotfixes/`. Stimmt mit pundo-cleanup überein, aber nicht mit Agents und F8950 (s. o.). | Mit dem kanonischen Bug-Ort abgleichen. | P1 |
| pundo-cleanup:8 | `model: claude-sonnet-4-6`. | `model: sonnet`. | P2 |
| pundo-cleanup:193 vs 182 | Scan Schritt 1 sucht Bugs mit `-path "*/Bugs/B*.md"` unter `20 Features`. Sektion 12 sagt aber: „Bugs liegen NICHT mehr in `FGx/Bugs/`“. In der Realität liegen weiter viele Dateien in `FG*/Bugs/` (z. B. `FG8 …/Bugs/B8950-001…010`, `FG6 …/Bugs/B6400-010/specs/…`). | Scan auf beide Orte erweitern und Abweichungen als Migrationsliste ausgeben, bis der kanonische Ort entschieden ist. | P1 |
| pundo-cleanup:132-149 | „Capability-Drift … Phase-9-Daueraufgabe“ zählt mit `find … -name page.tsx` und `grep @router`. Brauchbar, aber „Phase 9“ ist ein Fossil. | Phasenbezug streichen. | P3 |
| pundo-cleanup:110 | Sortier-Prefix-Liste nennt `__ Bugs & Hotfixes.md` als Datei. Real ist es ein Ordner, und `01 Arbeitsweise.md` fehlt. | Liste aktualisieren oder durch einen Verweis auf Conventions.md ersetzen (eine Quelle). | P3 |
| pundo-cleanup/SKILL.md.bak-20260627 | Backup-Datei im Skill-Ordner. | Löschen (Hygiene). | P3 |
| log-researcher/ | Nur `.last_scan` (2026-04-25), keine SKILL.md, kein Effekt. | Ordner löschen. | P3 |
| e2e-tester/.last_run (User-Ebene) | Verwaister Marker (2026-04-25, Backend-Feature) ohne Skill. | Löschen. | P3 |
| synced/pipeline-log-analyst | `model: haiku` passt (Log-Zusammenfassung). Die Description „Wird automatisch aktiviert wenn der User fragt: was ist passiert, … Fehler beim Lauf, letzter Lauf“ ist aber sehr breit. Sie kollidiert mit Pundo-Kontexten (E2E-Lauf, Pipeline-Lauf), obwohl der Skill nur für `local-knowledge-app` gilt. | Description auf „Ingestion-Pipeline der local-knowledge-app“ eingrenzen. **Achtung:** Synced-Skills werden aus claude.ai synchronisiert, also dort ändern, nicht lokal (lokale Edits werden überschrieben, unsicher). | P2 |
| synced/pundo-guide-author | Pfade `src/app/(customer)/guides/[slug]/page.tsx`. Real ist es `src/app/(customer)/[lang]/guides/…`. Der Blog (`content/blog/`) ist nicht abgedeckt. | Pfade aktualisieren (Quelle in claude.ai). | P3 |
| synced/bb-quick-capture | Klar, kein Modellbezug, guter Stil (Begründungen, „act, then report“). | Keine Änderung. | – |

### Frontend-Repo-Skills (`pundo_frontend/.claude/skills/`)

| Datei | Problem | Konkrete Änderung | Prio |
|---|---|---|---|
| architect, coder, e2e-tester: `model: claude-sonnet-5` | Vorgängermodell (Sonnet 5). Gültige ID, aber schwächer als Sonnet 5.5 bei gleichem Preis. Zudem liegt Sonnet unter der Session-Wahl, wenn Bernhard in Opus arbeitet: Der Skill würde mitten in der Session auf Sonnet 5 herunterschalten. | Architect: `opus`. Coder/E2E: `sonnet`. Oder das Feld ganz weglassen (erbt die Session). | P2 |
| architect, coder, e2e-tester: `tools:` | Kein gültiges Skill-Feld (siehe oben). `Agent` in der Liste ist ohnehin wirkungslos. | Entfernen bzw. `allowed-tools`. | P3 |
| architect:71-119, 213-219 | Modulbaum und Routentabelle von ca. März 2026: `src/app/products/[slug]`, `src/app/shops/[id]`, `src/app/search`. Real gibt es Route-Groups `(customer)/[lang]/…`, `(shop-admin)`, `(system-admin)`, `(oauth)`, `crm`, `shops/[slug]`, und die Komponenten-Ordner haben sich verdreifacht. | Den Baum **löschen** und auf `docs/architecture.md` verweisen. Das Modell liest den Code sowieso, und ein falscher Baum ist schädlicher als keiner. | P1 |
| architect:44,188-190,236 / coder:36,416 / e2e:1235 | „RTL-Flag kommt vom Backend … NIEMALS im Frontend raten“. Real: `src/app/(customer)/layout.tsx` setzt `dir` über `isRTL(lang)` aus `src/lib/lang.ts` (`RTL_LANGS = {ar, he}`). Die Regel ist falsch und kann zu unnötigen API-Feldern führen. | Umschreiben: „RTL über `isRTL()` aus `src/lib/lang.ts`. Keine eigenen Sprachlisten.“ | P1 |
| architect:143-152 | „PFLICHT: … **automatisch** den Backend-Architect anstoßen … parallel“. Widerspricht Coordinator und Agent. | Streichen, durch den Marker-Verweis ersetzen. | P1 |
| architect:290-329 | Journey-Deltas mit „User-Bestätigung (j/n) … Warte auf Antwort“. Im Chain nicht ausführbar. „Phase 1 … Iteration 2“ ist ein Fossil. | Ergebnis als Abschnitt in 02-architecture.md, Bestätigung gesammelt durch den Menschen am Kettenende. Iterations-Hinweis streichen. | P2 |
| architect:332-353 | Trade-off-Tabelle und Leitfragen (Clean Boundary, Server/Client) sind gutes Kontextwissen. | Behalten, ins Playbook. | – |
| coder:37, 413 / e2e:1233 / AGENTS.md | „Next.js 16.2.2“. Installiert ist 16.2.10. | Versionsnummer streichen („siehe package.json“), denn Versionsnummern veralten. | P2 |
| coder:40 / e2e:466 / BE-coder:62 / BE-e2e:44 | Deploy-Hook-Absatz viermal wortgleich. Zusammen mit „Kein automatisches Commit“ lädt er zum Pushen ein. | Einmal in der User-CLAUDE.md (Abschnitt „Agent-Kommunikation mit prod“), hier löschen. | P2 |
| coder:61-71 / e2e:807-816 | Bug-Register-Pfad `FG8 Admin & Operations/Bugs/B<id>/B<id>.md` für **alle** Bugs. Konflikt mit pundo-cleanup (zentral) und Agent (FG-spezifisch). | Kanonischen Ort festlegen (siehe oben). | P1 |
| coder:89-91 | Nummerierung „5. Tests schreiben / 5. Tests laufen lassen“ doppelt. | Ganze Reihenfolge durch Ziel + Verifikation ersetzen: „Fertig heißt: Tests für neue Pfade grün, `npx tsc --noEmit` und `npm run lint` ohne Fehler.“ | P3 |
| coder:169-197 | Anleitung „Falls Vitest noch nicht eingerichtet: npm install …“ samt Config-Beispiel. Vitest 4 ist installiert, `vitest.config.ts` existiert, mit abweichenden Aliasen. | Löschen. | P2 |
| coder:215-302 | Mock-Matrix und Mock-Snippets sind Wissen, das die 5er-Modelle sicher beherrschen. Wertvoll sind nur die projektspezifischen Regeln: „Teste den schmutzigen Backend-Fall (Port 8000-URLs, `"3.0000"`)“ und die globalen Radix-Mocks. | Generisches streichen, Projektspezifisches behalten. | P2 |
| coder:340-345 | Coverage-Schwellen 80/90 %. Laut e2e „kein Blocker“, laut BE-coder „Schreibe weitere Tests bis der Schwellwert erreicht ist“. Das treibt Test-Sprawl. | Einheitlich: Schwelle als Richtwert, nur geänderte Module, keine Tests nur für die Quote. | P2 |
| coder:434 | „Admin-Translations → eigener Namespace (`shopAdmin: {…}`) in `translations.ts`“. Real gibt es eigene Dateien: `src/lib/shop-admin-translations.ts` und `system-admin-translations.ts`. | Korrigieren. | P1 |
| coder:421-422 | „maintaine den SKILL.md im /architect“: Ein Coder, der Skill-Dateien umschreibt, ist eine Quelle für Drift. | Streichen. Skill-Pflege nur auf Anweisung. | P2 |
| designer | Kopie des User-Designer-Skills (gleiche Fehler: Slug, Handoff-Pfad, `Use PROACTIVELY`) plus „Journey-Impact (Pflicht)“ mit j/n-Dialog und Jaccard-50-%-Regel. | Journey-Impact-Abschnitt in ein FE-Playbook verschieben, Skill löschen (c). | P1 |
| e2e-tester (gesamt, 1252 Z.) | Zwei „Phase 3“ (Visual Smoke Z. 56 und Browser-E2E Z. 416), zwei „Phase 4.5“ (Quality-Gate Z. 780, Living Docs Z. 1003), „Phase 5“ doppelt belegt (Übersicht: Qualitäts-Gate, Body: Produktions-Migration). Phase 3 steht vor Phase 0. | Neu gliedern (siehe Kürzungsplan unten). | P2 |
| e2e-tester:65,96,519,540 | Codebeispiele nutzen `/products/<slug>`, `/search?q=`, `/?lang=ar`, `/shops/[id]`, also **ohne `/{lang}/`-Präfix**. Laut AGENTS.md erzeugt das 404/RSC-Fehler. Wer die Beispiele kopiert, schreibt kaputte Tests. | Beispiele löschen und auf `e2e/smoke.spec.ts` / `e2e/journeys/` verweisen (es gibt echte Specs). | P1 |
| e2e-tester:420-438 | Playwright-Setup mit `baseURL: http://localhost:3000` und `command: 'npm run dev'`. Beides ist falsch (Port-Regel, Script entfernt). | Löschen, `playwright.config.ts` existiert bereits. | P1 |
| e2e-tester:29,451-462 | „Frontend down: `lsof -ti:3500 | xargs kill -9; npm run dev:test &`“ ist korrekt (Test-Port). Gut. Aber „Erst nach erfolgreichem Test-Lauf darf die Produktiv-Datenbank (Port 8000) berührt werden“: Am Studio gibt es kein 8000. | Prod-Satz streichen. Studio-Hinweis F6995 als einzige Wahrheit. | P2 |
| e2e-tester:203-271 | Phase 0.5: Heuristiken H1–H5 mit Pfaden `src/app/<segment>/page.tsx`, `src/app/shop-admin/**`, `src/app/shops/[id]/**`. Real heißen sie `src/app/(customer)/[lang]/…` bzw. `src/app/(shop-admin)/…`. H1/H2 triggern deshalb nie richtig. Score-Tabelle und Max-3-Regel sind Arithmetik, die in Code gehört. | Pfade korrigieren. Scoring in `e2e/journeys/_parser.ts` implementieren (`findOverlap` ist schon dort) und im Skill nur aufrufen. | P2 |
| e2e-tester:271,676,968-979 | Mehrfach „Tester fragt User (j/n)“, „Soll ich diese Änderung anwenden? (j/n)“. | Im Chain-Modus: Vorschläge sammeln und im Report unter „Entscheidungen für Bernhard“ ausgeben. | P1 |
| e2e-tester:1102-1186 | Phase 5 „Produktions-Migration“ (`.venv/bin/alembic upgrade head` im Backend-Repo). Am Studio trifft sie `pundo_test` (`DATABASE_URL=…/pundo_test`), auf Hetzner macht das der Deploy-Hook. Der Abschnitt ist irreführend und kann den Schema-Stand von pundo_test still verändern. | **Löschen.** | P1 |
| e2e-tester:1192 | „Ausnahme Phase 5: Alembic-Migrations auf `pundo` sind explizit erlaubt“ widerspricht AGENTS.md (am Studio existiert `pundo` nicht). | Löschen. | P1 |
| e2e-tester:22,1229-1238 | Grundregeln am Anfang und „Wichtige Hinweise“ am Ende wiederholen sich weitgehend. | Einmal oben, kurz, mit Begründung. | P3 |
| frontend-designer (Name `frontend-design`, Ordner `frontend-designer`) | Generischer Anthropic-Beispiel-Skill. Er fordert „NEVER … Inter, Roboto … NEVER converge on … Space Grotesk“ und „Vary between light and dark themes … No design should be the same“. Pundo nutzt aber bewusst **Space Grotesk**, DM Sans, Unbounded und Golos Text (`src/app/(customer)/layout.tsx:3`) und hat eine Brand-Identity (Vault `11 Brand & Visual Identity Pundo.md`). Bei UI-Arbeit im Repo zieht der Skill also weg von der Marke. Er ist auch identisch im Backend-Repo vorhanden, wo er nichts zu suchen hat. | Im Backend löschen. Im Frontend entweder löschen oder durch einen kurzen „pundo-ui“-Skill ersetzen, der auf die Brand-Datei und die vorhandenen Fonts/Tokens verweist. Name und Ordner angleichen. | P2 |
| `.claude/worktrees/laughing-chatterjee-e5192b/` | Veralteter Worktree (2026-07-14) mit eigener `.claude/skills/`-Kopie aller 5 Skills (git-ignoriert). Verschachtelte `.claude/skills` können beim Arbeiten in Unterordnern mitgeladen werden (unsicher). | Worktree entfernen (`git worktree remove`), entspricht auch der Memory-Regel „kein Worktree“. | P3 |

### Backend-Repo-Skills (`pundo_main_backend/.claude/skills/`)

| Datei | Problem | Konkrete Änderung | Prio |
|---|---|---|---|
| designer:9 | `model: claude-opus-4-6`, drei Generationen alt. | `inherit`/`opus` (siehe d), oder Skill zusammenführen. | P2 |
| designer:39-216 | Der Ansatz „max. 3 Fragerunden, adaptiv“ ist der **beste** Designer-Prompt im System. Er funktioniert aber nur interaktiv (Hauptthread). Projektkontext 183-201 ist veraltet: `ingestor/models/ … (Product, Provider, Manufacturer, Category, Price)`, „Anthropic Batch API bevorzugt“, „MVP-Fokus Pet-Kategorie“. Die Downstream-Checkliste 159-179 wiederholt das Template. | Fragerunden-Logik in den vereinheitlichten Designer-Skill übernehmen. Projektkontext durch Verweis auf CLAUDE.md und Vault ersetzen. Checkliste kürzen. | P2 |
| designer:24 | Beispiel-FG „FG3 Ingestion & Taxonomie“. Real ist FG3 „Community & Vertrauen“. | Korrigieren oder Beispiel streichen. | P3 |
| architect:69-157 | Modulbaum mit `product.py`, `offer.py`, `product_attribute.py`, `product_translation_status.py`. Die gibt es nicht mehr. Real: `item.py`, `shop_listing.py`, `unified_offer.py`, `item_translation_status.py`, `crm/` u. v. m. Persistenz-Tabelle 205-219 ebenso (Products/Offers sind laut Agent coder.md:44 Legacy). | Baum und Tabelle löschen. Verweis auf `docs/data-model.md` und Vault `20 Datenbank & Taxonomie.md` (der Agent verweist schon dorthin). | P1 |
| architect:62,223-240,319,328 | „Batch-first für LLM-Calls: Anthropic Message Batches API“, „Model für Übersetzungen: claude-haiku-4-5-20251001“. AGENTS.md (Frontend) sagt aber: Provider-SDKs leben **nur** in `pundo_llm_workers`, das Gateway ist der Dispatcher. Im Backend existieren zwar noch direkte `anthropic`-Imports (u. a. `ingestor/translation/batch_client.py`, `ingestion/category_matcher.py`), daneben aber auch schon `gateway_client.py`. Unklar, welcher Weg Soll ist (unsicher). | Architektur-Entscheidung festhalten: „Neue LLM-Aufrufe über den Gateway-Client. Kein neuer direkter SDK-Call.“ Die Batch-API-Leitlinie im Backend-Architect entsprechend umschreiben. Modell-IDs nicht im Skill pinnen (gehört in `routing.yml`). | P1 |
| architect:11 | `model: claude-sonnet-5`. | `opus`. | P2 |
| architect:27 | Bug-Pfad `<FG>/Bugs/B<id>.md`. | Kanonischen Ort angleichen. | P1 |
| coder:155,160,164,167,194 | **Postgres-Passwort im Klartext** (5×), git-getrackt. Plus eine fertige Befehlszeile gegen DB `pundo` („NUR auf Hetzner relevant … Am Studio überspringen“), also ein Prod-Befehl mit „bitte nicht“-Kommentar. | Alle Zeilen auf `"$DATABASE_URL_TEST"` umstellen. Den Prod-Schritt löschen (auf Hetzner macht das der Deploy-Hook). Passwort rotieren, weil es in der Git-History steht. | P1 |
| coder:101-146 | Backup-Snippet: `docker exec pundo_postgres pg_dump` (Container existiert am Studio). `find … -mtime +2 -delete` löscht Backups automatisch nach 2 Tagen. Ok als exaktes Skript (fragiler Vorgang), aber „NIEMALS eine Migration ohne vorheriges Backup bei vorhandenen Produktionsdaten“ bezieht sich auf Prod, das es am Studio nicht gibt. | Behalten (exaktes Skript gerechtfertigt), Formulierung auf pundo_test beziehen. | P3 |
| coder:40,216,377 vs. BE-CLAUDE.md:38 | Lint nur `ruff check .`. CLAUDE.md: `ruff check . && black --check . && mypy .`. | An CLAUDE.md angleichen, nur dort pflegen. | P2 |
| coder:236 / e2e: Mock-Matrix | „PostgreSQL → In-Memory SQLite oder Mock“. Das Schema nutzt PostGIS, JSONB und pgvector (`category_embedding.py`, `catalog_case_item_embedding.py`). SQLite-Tests sind dafür wertlos. | Streichen. Gegen `pundo_test` mit Transaktions-Rollback oder Mocks testen. | P2 |
| coder:256 | „Kein conftest-Overhead — Tests müssen ohne Setup laufen“. `ingestor/tests/conftest.py` existiert und wird genutzt. | Streichen. | P2 |
| coder:260-284 | Mock-Pattern für die Anthropic Batch API. Relevant nur, solange Batch im Backend Soll ist (siehe architect). | Mit der LLM-Architektur-Entscheidung abgleichen. | P3 |
| coder:286-300 | Pydantic `model_dump(mode='json')` für JSONB: echte, projektspezifische Lehre mit Begründung. | Behalten. | – |
| coder:341-347 | Coverage-Listen nennen `ingestion/categorizer.py`, `normalizer.py`, `translator.py`, `receiver.py`, `store.py`. Prüfwürdig, wahrscheinlich nicht mehr vorhanden: Im Architect-Baum heißen sie `category_matcher.py`/`normalizers.py` (unsicher). | Liste löschen. „Geänderte Module“ als Scope. | P2 |
| coder:397 vs 373 | Abschnitt 3.6 steht vor 3.5. | Ordnen. | P3 |
| coder:470-491 | Verwaiste nummerierte Liste ohne Überschrift (Docker-Upload-Pfade, `parents[2]`). Inhaltlich sehr wertvoll („drei Mal passiert“). | Überschrift „Neue Upload-Verzeichnisse“, Inhalt behalten. Die to-prod-Nachricht als konkrete Aktion aus `~/.claude/CLAUDE.md` verlinken. | P2 |
| e2e-tester:593-608 (I-06) | `alembic downgrade base` + `upgrade head` gegen `$DATABASE_URL`, am Studio `pundo_test` mit Prod-Daten. **Löscht alle Tabellen und Daten.** Widerspricht der eigenen DB-Reset-Regel (Z. 59). | **Löschen.** Falls ein Downgrade-Test gewünscht ist: nur gegen eine Wegwerf-DB und nur mit `E2E_RESET_DB=true`. | P1 |
| e2e-tester:405-428 (I-01) | Erwartete Tabellen `products, providers, manufacturers, prices` gibt es nicht (mehr). | Löschen oder auf das aktuelle Schema umstellen. | P1 |
| e2e-tester:432-602 (I-02…I-05) | Taxonomie-Seed- und UNSPSC-Batch-Smoke-Tests aus der Anfangsphase. I-04 kostet Geld und nutzt `/tmp` statt Scratchpad. Für typische heutige Features (CRM, Shop-Admin, Catalog Cases) irrelevant. | In `reference/legacy-taxonomy-tests.md` auslagern oder löschen. Der Kern-Skill testet die AKs aus 01-design.md. | P2 |
| e2e-tester:363-374 | „PostgreSQL down: `docker-compose up -d db` … `brew services start postgresql@16`“: Startet ggf. eine zweite Postgres. Am Studio läuft der Container `pundo_postgres`. | Auf `docker start pundo_postgres` reduzieren. | P2 |
| e2e-tester:10 | `model: claude-sonnet-5`. | `sonnet`. | P2 |
| e2e-tester:494 | `Agent(subagent_type="general-purpose", …)` ist aktuelle Syntax, ok. Aber `tools: … Agent` im Skill-Frontmatter wirkt nicht. | Frontmatter bereinigen. | P3 |
| e2e-tester/.last_run | Stand 2026-04-25, „158 pre-existing failures“. Widerspricht F8950 („kein pre-existing mehr“). | Beim nächsten Lauf überschreiben lassen. Keine Skill-Änderung nötig, Hinweis zur Einordnung. | P3 |
| export-content | Richtung **Studio → Prod** (pg_dump `--data-only` von DB `pundo`, rsync `--delete` nach `/opt/pundo-app/media/`). Am Studio existiert `pundo` nicht, und der Datenfluss ist heute Prod → Test (`sync_prod_to_test.sh`). `deploy/export-content.sh` existiert nicht. Tabellenliste mit `products`, `offers`, `product_attributes` (Legacy). Die Description triggert automatisch bei „Export … sync to production“. | **Löschen**, oder mindestens `disable-model-invocation: true` setzen und als „veraltet“ kennzeichnen. Gefährlicher Rest. | P1 |
| frontend-designer (Backend) | Identische Kopie des FE-Skills. Im Backend ohne Zweck. | Löschen. | P3 |

### Kontextdateien

| Datei | Problem | Konkrete Änderung | Prio |
|---|---|---|---|
| FE `AGENTS.md` + BE `CLAUDE.md` „Autonomous Spec Workflow“ | `specs/<feature-slug>/` im Repo (siehe Summary 1). | Vault-Pfad eintragen. | P1 |
| BE `AGENTS.md` Port-Block | „`npm run dev` → Port 3000, Backend 8000“: Das Script ist entfernt. „`DATABASE_URL` zeigt auf `pundo`“ stimmt am Studio nicht. Der Studio-Hinweis darunter korrigiert das zwar, aber der Text widerspricht sich innerhalb des Blocks. | Zeile streichen, Studio-Realität zuerst nennen. | P2 |
| BE `CLAUDE.md` Konventionen | „Branches `feat/<slug>` … PR-Target `develop` (niemals direkt in `main`)“ vs. Memory/Agent „direkt auf main“. | Entscheiden, eine Version löschen. | P1 |
| FE `AGENTS.md` | „Next.js 16.2.2“. | Versionsnummer weglassen. | P3 |
| `~/.claude/settings.json` | `"model": "sonnet"`, `"effortLevel": "medium"` als User-Default. Mit dem Alias ist das Sonnet 5.5, ok. Die Skills mit `model:`-Pin überschreiben das aber auf ältere Modelle. | Pins entfernen (siehe d). Für Spec-Workflow-Sessions ggf. `opus` als Session-Modell wählen. | P2 |
| FE `.claude/settings.json` | Erlaubt `git push origin:*` und `git commit:*` ohne Rückfrage. In Kombination mit Agent-coder „commit“ und dem Push-Deploy-Hook kann ein Agent ohne Freigabe auf Prod deployen. | `git push` aus der Allow-Liste nehmen (bleibt dann bestätigungspflichtig). | P1 |

### Kürzungsplan FE-`e2e-tester` (Progressive Disclosure)

Ziel: `SKILL.md` ≤ ~150 Zeilen. Rest in `reference/*.md`, die nur bei Bedarf gelesen werden.

| Bleibt in SKILL.md (Kern) | Wandert nach `reference/` | Wird gelöscht |
|---|---|---|
| Input/Output/Handoff, Verdict-Regeln (SHIP nur bei leerem `open_failures`, `node scripts/verdict-gate.mjs`), Anti-Schöntest-Regel (Kurzform mit Begründung), Sicherheitsregeln (3500/8500, kein DB-Reset, keine Prod-Restarts), Reihenfolge: Scope → statisch → Unit → Smoke → Journeys → Gate → Report | `journey-catalog.md` (Phase 0.5 + 3.5, korrigierte Pfade), `quality-gate-f8950.md` (RCA-Kategorien, Bug-Datei-Template, Diff-Check-Regex), `acceptance-checklist.md` (E2E-01…08 als Prüfpunkte, **ohne** Codebeispiele, mit `/{lang}/`-Routen), `docs-sync.md`, `testset-template.md` | Vitest/Playwright-Setup, Playwright-Config-Beispiel (Port 3000/`npm run dev`), Inline-Testcode mit Pfaden ohne Lang-Präfix, generische Mock-Matrix (steht im coder), „Fehlerbehandlung: Max 3 Versuche“, Phase 5 Produktions-Migration, doppelte Grundregeln, ASCII-Banner |

Analog: BE-`e2e-tester` (714 Z.) → Kern + `reference/legacy-taxonomy-tests.md`. FE/BE-`coder` → Setup-Anleitungen und generische Mock-Snippets raus. FE/BE-`architect` → Modulbäume raus, dafür Verweis auf `docs/architecture.md` bzw. `docs/data-model.md`.

---

## (c) Konsolidierungsvorschlag für die doppelten Rollen

### Ist-Zustand: welche Datei greift wann

| Aufruf | Geladene Definition | Folge |
|---|---|---|
| `Agent(subagent_type: "coder")`, auch durch den `/coordinator` | `~/.claude/agents/coder.md` (Sonnet, Vault-Pfade, „commit auf main“) | **Kein** repo-spezifisches Wissen aus den Repo-Skills (Journey-Katalog, F8950-Bugregister, Clean Boundary, Tooltip-Pflicht, Upload-Pfad-Regel). Nur CLAUDE.md wird zusätzlich geladen (unsicher, ob in jedem Fall). |
| `/coder` oder Skill-Auto-Trigger im Frontend-Repo | `pundo_frontend/.claude/skills/coder/SKILL.md` (Sonnet 5, „kein Commit“) | Läuft **im Hauptthread**, keine Isolation. Andere Commit-Regel. Kein 03-implementation.md-Zwang im FE-Skill. |
| `/designer` | Name existiert als User- **und** als Repo-Skill. Laut Doku gewinnt bei Namensgleichheit die höhere Ebene (enterprise > personal > project), also die **User-Version** (unsicher, bitte mit `/skills` prüfen). | Die FE-Version mit dem Journey-Impact-Abschnitt wird dann nie geladen. |
| `/coordinator` → Backend | „Spawne `pundo_main_backend/.claude/skills/architect/SKILL.md`“ | Technisch unklar. Faktisch läuft der generische `architect`-Agent, ohne Backend-Kontext. |

Kernproblem: Die Kette (Agents) und das Repo-Wissen (Skills) sind getrennt, und es gibt drei verschiedene Regelwerke zu Commit, Bug-Pfad, Backend-Trigger und Slug.

### Soll-Zustand (empfohlen)

1. **Kettenprotokoll genau einmal:** `~/.claude/agents/{architect,coder,e2e-tester}.md`, repo-agnostisch. Inhalt: Input/Output-Dateien, Vault-Pfade, Handoff-Satz, Verdict-Regeln, Commit-Regel, und **ein** Satz: „Lies zuerst `<repo>/.claude/playbooks/<rolle>.md` für jedes betroffene Repo.“
2. **Repo-Wissen als Playbook, nicht als gleichnamiger Skill:** `pundo_frontend/.claude/playbooks/{architect,coder,e2e-tester}.md` und dasselbe im Backend, plus `reference/`-Unterdateien für lange Teile. Hinein kommen die heute guten, projektspezifischen Inhalte: Clean Boundary, Tooltip-Pflicht, Journey-Katalog-Regeln, F8950-Gate, `model_dump(mode='json')`, Upload-Pfade, sync_tables, DEFERRABLE FK. Die Repo-Skills `architect`/`coder`/`e2e-tester`/`designer` werden gelöscht. Damit triggert auch nicht mehr versehentlich ein Skill mit `claude-sonnet-5` im Hauptthread.
   - Alternative B (unsicher, ob in dieser Claude-Code-Version verfügbar): Repo-Agent-Overrides `.claude/agents/coder.md` pro Repo. Projekt-Agents haben Vorrang vor User-Agents. Nachteil: Das Kettenprotokoll müsste dann wieder pro Repo dupliziert werden.
   - Alternative C (unsicher): Repo-Skills behalten, aber mit `context: fork` + `agent: coder` als Subagent-Lauf und `disable-model-invocation: true`. Das ist nur sinnvoll, wenn Bernhard die Slash-Commands `/coder` usw. weiter direkt nutzen will.
3. **Designer = ein User-Skill (interaktiv), kein Agent.** Der Designer ist die einzige Station, die mit Bernhard Fragen klären soll (die BE-designer-Idee „max. 3 Runden“ ist richtig). Das geht nur im Hauptthread. Konkret:
   - User-Skill `designer` neu, aus User-Skill + Agent + BE-designer (Fragerunden) + FE-designer (Journey-Impact als `reference/journey-impact.md`).
   - Agent `designer.md` löschen. Der Coordinator ruft für Phase 1 nicht mehr den Agent auf, sondern gibt an Bernhard zurück: „Bitte `/designer <thema>` ausführen.“ Oder er führt den Skill selbst im Hauptthread aus.
4. **Coordinator:** Repo-Katalog auf „Agent X + Playbook-Pfad“ umstellen. Gateway und Workers bekommen zunächst kein Playbook (Fallback: Repo-CLAUDE.md), so wie es heute de facto schon läuft.
5. **Einheitliche Konventionen an einer Stelle** (Vault `00 Überblick/Conventions.md` oder `~/.claude/CLAUDE.md`), überall nur verlinkt:
   - Slug: `YYYY-MM-DD-kebab`
   - Bug-Ablage (eine Variante wählen)
   - Commit/Push: Agents committen nie, Bernhard gibt frei. Push = Prod-Deploy.
   - Backend-Trigger: Der Architect setzt den Marker, der Coordinator startet.
   - Verdicts: SHIP/FIX/ESCALATE, BLOCKED nur pro Kriterium.
6. **Aufräumen:** `export-content` und beide `frontend-designer` (BE sicher, FE nach Wahl), `log-researcher/`, die verwaisten `.last_run`, `pundo-cleanup/SKILL.md.bak-*` und den alten Worktree entfernen.

---

## (d) Vorgeschlagene Frontmatter pro Agent/Skill

Begründung der Modellwahl: Opus 5.5 kostet nur noch das Doppelte von Sonnet 5.5 ($4/$20 vs. $2/$10). Für Rollen mit viel Urteil und wenig Token-Volumen (Architect, Coordinator, Designer) lohnt Opus. Für token-intensive Ausführung (Coder liest und schreibt viel, Tester führt lange Läufe) ist Sonnet 5.5 das Kosten-Nutzen-Optimum. Fable 5.1 ($10/$50) eignet sich nicht als Default. Sinnvoll ist es nur gezielt, wenn eine ESCALATE-Ursachenanalyse oder eine heikle Cross-Repo-Architektur festhängt; dann per `Agent(model: "fable")` im Einzelfall. Immer Aliase statt IDs verwenden, damit nichts veraltet. Effort: Opus 5.5 läuft standardmäßig auf `medium`. Für Architect und Coordinator lohnt `high`. Ob ein `effort`-Feld im Agent-Frontmatter unterstützt wird, ist unsicher; sonst gilt die Session-Einstellung (`effortLevel: medium` in settings.json).

```yaml
# ~/.claude/agents/architect.md
---
name: architect
description: >
  Erstellt 02-architecture.md für ein Pundo-Feature oder einen Bug: betroffene Dateien,
  Datenmodell, API-Contracts, Risiken, nummerierte Tasks T1..Tn. Nutzen, wenn eine
  01-design.md (oder Bug-Datei) im Pundo-Plattform-Vault vorliegt und ein umsetzbarer
  Plan gebraucht wird. Implementiert nicht. Nicht für schnelle Ad-hoc-Architekturfragen
  im Gespräch.
tools: Read, Write, Edit, Glob, Grep, Bash
model: opus
---
```

```yaml
# ~/.claude/agents/coder.md
---
name: coder
description: >
  Setzt die Tasks aus einer vorhandenen 02-architecture.md um (Code + Tests im Repo,
  Protokoll in 03-implementation.md im Vault). Nutzen, wenn ein fertiger
  Architektur-Plan vorliegt oder der User eine klar spezifizierte Umsetzung verlangt.
  Committet und pusht nicht.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---
```

```yaml
# ~/.claude/agents/e2e-tester.md
---
name: e2e-tester
description: >
  Prüft eine Umsetzung gegen die Akzeptanzkriterien aus 01-design.md auf den
  Test-Instanzen (3500/8500), pflegt Journeys und Bug-Register, schreibt
  04-test-report.md und liefert SHIP / FIX / ESCALATE. Nutzen nach einer
  abgeschlossenen 03-implementation.md oder für einen Qualitäts-Check. Repariert
  keinen Produktionscode.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---
```

```yaml
# ~/.claude/skills/designer/SKILL.md   (ersetzt Agent + 3 Skill-Varianten)
---
name: designer
description: >
  Klärt eine Feature-Idee im Dialog (höchstens 3 Fragerunden) und schreibt
  01-design.md mit User-Flows, Komponenten, nummerierten Akzeptanzkriterien und
  Journey-Impact in den Pundo-Plattform-Vault. Nutzen, wenn der User eine
  Feature-Spec will oder den Spec-Workflow startet. Nicht für kleine UI-Fixes
  oder Bugs (die gehen direkt zum architect).
model: inherit          # bzw. weglassen; im Hauptthread mit Bernhards Sessionmodell
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---
```

```yaml
# ~/.claude/skills/coordinator/SKILL.md
---
name: coordinator
description: >
  Orchestriert designer → architect → coder → e2e-tester über alle betroffenen
  Pundo-Repos für einen Feature-Slug, prüft jede Übergabe gegen eine Checkliste
  und eskaliert nach einem Retry. Committet nicht. Aufruf: /coordinator <slug>.
model: opus
disable-model-invocation: true
---
```

```yaml
# ~/.claude/skills/inbox-triage/SKILL.md
---
name: inbox-triage
description: >
  Triagiert offene Items in "00 GTD/Tasks Inbox.md": routet per Tag (#pundo, #lka,
  #privat) ins passende Vault-Ziel und setzt "→ migriert nach [[…]]"-Marker.
  Schreibt erst nach Bestätigung, empfiehlt danach /pundo-cleanup.
  Aktivieren mit "/inbox-triage", "Inbox aufräumen", "Tasks sortieren".
model: sonnet
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---
```

```yaml
# ~/.claude/skills/pundo-cleanup/SKILL.md
---
name: pundo-cleanup
description: >
  Stellt einen konsistenten Zustand im Pundo-Plattform-Vault her (Frontmatter,
  FG-Indizes, Stubs, Bugs, Journeys, Roadmap, Coverage-Drift gegen Code).
  Aktivieren mit "Räum auf", "/pundo-cleanup" oder bei Zweifeln an der Vault-Struktur.
model: sonnet
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---
```

Synced `pipeline-log-analyst`: `model: haiku` beibehalten, Description in claude.ai eingrenzen (siehe b).

### Prompt-Stil: Leitlinien für die Überarbeitung

- **Sicherheitsregeln bleiben**, weil sie auf echte Vorfälle zurückgehen: Ports, keine Prod-Restarts, kein DB-Reset, Anti-Schöntest, Upload-Pfade, sync_tables, DEFERRABLE FK. Sie werden aber einmal, ruhig und mit Begründung formuliert statt in `**NIEMALS**`/`KRITISCH`/`PFLICHT`-Ketten. Bei den 5er-Modellen führt Druck-Sprache eher zu Über-Anwendung (z. B. zur Weigerung, legitime Test-Restarts zu machen).
- **Ziel und Verifikation statt Choreografie:** Statt „1. Verstehen 2. Typen 3. Implementieren …“ besser „Fertig heißt: … grün, … fehlerfrei“.
- **Generisches Programmierwissen streichen** (Mocking-Grundlagen, Server- vs. Client-Komponenten-Basics, Ruff-Code-Tabelle), **Kontextwissen behalten.**
- **Arithmetik in Code**: Journey-Scoring, Jaccard und Max-3-Regel gehören nach `e2e/journeys/_parser.ts`.
- **Keine Versionsnummern, Modulbäume oder Tabellenlisten in Skills.** Stattdessen auf `package.json`, `docs/architecture.md` und `docs/data-model.md` verweisen.
- **Keine Formular-Banner (╔═══╗) als Ausgabevorlage.** Das Modell kopiert sie exakt, und sie kosten Tokens. Schlichte Markdown-Tabellen genügen.
