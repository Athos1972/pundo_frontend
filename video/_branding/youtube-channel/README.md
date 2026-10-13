# YouTube-Kanal @pundocy — Kanal-Branding

Assets erzeugen: `node video/_branding/youtube-channel/render.mjs` → `out/` (gitignored).

> **Stand 2026-10-13: alles unten Aufgeführte ist im Kanal eingespielt** (Profilbild, Banner, Wasserzeichen „gesamtes Video“,
> Beschreibung EN + Übersetzungen EL/RU, Keywords, 2 Links, Tab „Übersicht“ mit Kanaltrailer `channel-trailer` EN für Nicht-Abonnenten).
> Playlists EN/EL und Endscreens aller Videos sind ebenfalls angelegt (Details und Regeln für neue Videos: Vault N7900). Bei Änderungen an Texten hier **und** in YouTube Studio pflegen.

| Datei | Größe | Wo in YouTube Studio |
|---|---|---|
| `out/avatar.png` | 800×800 | Anpassung → Branding → Bild |
| `out/banner.png` | 2560×1440 (Safe Area 1546×423) | Anpassung → Branding → Bannerbild |
| `out/watermark.png` | 150×150, transparent | Anpassung → Branding → Videowasserzeichen („Gesamtes Video“) |
| `out/banner-preview.png` | nur QA | zeigt Mobile-/Desktop-/TV-Ausschnitt |

## Kanalbeschreibung (Primärsprache Englisch)

```
pundo helps you find products, services and prices from local shops and businesses near you, anywhere in Cyprus: Limassol, Paphos, Larnaca, Nicosia and beyond.

On this channel:
▸ How-to videos for shoppers: search, compare prices and discover businesses nearby
▸ Tutorials for shop owners: list your business for free in under 5 minutes and add your products, services and prices
▸ Expat guides to everyday life in Cyprus

Free for shoppers. Free for local businesses.
🌐 https://pundo.cy
🏪 For businesses: https://pundo.cy/en/for-shops

Available in English, Ελληνικά, Русский, Deutsch, العربية and עברית.
```

### Übersetzung Griechisch (Einstellungen → Kanal → Grundlegende Infos → Sprache hinzufügen)

```
Το pundo σε βοηθά να βρεις προϊόντα, υπηρεσίες και τιμές από τοπικά καταστήματα και επιχειρήσεις κοντά σου, σε όλη την Κύπρο: Λεμεσό, Πάφο, Λάρνακα, Λευκωσία και αλλού.

Σε αυτό το κανάλι:
▸ Βίντεο για αγοραστές: αναζήτηση, σύγκριση τιμών και επιχειρήσεις κοντά σου
▸ Οδηγοί για καταστηματάρχες: καταχώρισε δωρεάν την επιχείρησή σου σε λιγότερο από 5 λεπτά και πρόσθεσε προϊόντα, υπηρεσίες και τιμές
▸ Οδηγοί για την καθημερινή ζωή στην Κύπρο

Δωρεάν για αγοραστές. Δωρεάν για τοπικές επιχειρήσεις.
🌐 https://pundo.cy/el
🏪 Για επιχειρήσεις: https://pundo.cy/el/for-shops
```

### Übersetzung Russisch

```
pundo помогает находить товары, услуги и цены местных магазинов и компаний рядом с вами по всему Кипру: Лимассол, Пафос, Ларнака, Никосия и не только.

На этом канале:
▸ Видео для покупателей: поиск, сравнение цен и компании поблизости
▸ Инструкции для владельцев бизнеса: бесплатно разместите свой бизнес менее чем за 5 минут и добавьте товары, услуги и цены
▸ Гиды по повседневной жизни на Кипре

Бесплатно для покупателей. Бесплатно для местного бизнеса.
🌐 https://pundo.cy/ru
🏪 Для бизнеса: https://pundo.cy/ru/for-shops
```

## Keywords (Einstellungen → Kanal → Keywords; ersetzt „Pundo shopping Concentrator“)

```
pundo, Cyprus, Κύπρος, Limassol, Paphos, Larnaca, Nicosia, local shops Cyprus, price comparison Cyprus, services near me, shop owners Cyprus, small business Cyprus, expat Cyprus, Λεμεσός, καταστήματα Κύπρος
```

## Links (Anpassung → Grundlegende Infos → Links; erste Links erscheinen im Header)

1. `pundo` → https://pundo.cy
2. `For businesses` → https://pundo.cy/en/for-shops

## Kanal-Layout (Anpassung → Layout)

- **Playlists anlegen** (je Sprache getrennt, damit der Algorithmus sauber zuordnet):
  - „For shop owners (EN)“ — Shop-Signup, nächstes Video „Produkte, Dienstleistungen & Preise hinzufügen“
  - „Για καταστηματάρχες (EL)“ — dasselbe auf Griechisch
  - später: „Find it with pundo“ (Kunden-Videos), „Living in Cyprus“ (Expat-Guides)
- **Abschnitte** auf der Startseite: 1) Playlist For shop owners (EN), 2) Playlist Για καταστηματάρχες (EL), 3) Beliebte Videos
- **Kanaltrailer für Nicht-Abonnenten**: `video/channel-trailer/` EN (https://youtu.be/4h9b3Ws5FTc) ist gesetzt; EL-Fassung: https://youtu.be/i2fbU-8QwiA.
- **Endcards**: Outro hat bereits ≥ 10 s Platz — Element „Video: Nächstes“ + „Abonnieren“ setzen.
