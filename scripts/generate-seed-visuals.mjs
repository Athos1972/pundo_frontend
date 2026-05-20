/**
 * generate-seed-visuals.mjs
 *
 * Generates seed-visual master images via DrawThings HTTP API (localhost:7860).
 * DrawThings must be running with the HTTP API server enabled.
 *
 * CLI:
 *   node scripts/generate-seed-visuals.mjs              # all slugs
 *   node scripts/generate-seed-visuals.mjs --slug=ac-installation
 *   node scripts/generate-seed-visuals.mjs --dry-run
 *   node scripts/generate-seed-visuals.mjs --skip-existing  # skip already generated
 *
 * Output: public/seed-visuals/_masters/<slug>.jpg  (1024×1024)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const MASTERS_DIR = path.join(REPO_ROOT, 'public', 'seed-visuals', '_masters')
const API_URL = 'http://localhost:7860'

// ─── Stil-Anker ───────────────────────────────────────────────────────────────

const STYLE_PREFIX =
  'professional craft photography, warm neutral light, photorealistic, ' +
  'high detail, sharp focus, culturally neutral, ' +
  'shallow depth of field, studio lighting. ' +
  'If humans are in the image: Show european people'

// Bei FLUX schnell kaum wirksam, trotzdem mitschicken
const NEGATIVE_PROMPT =
  'blurry, low quality, distorted, text, watermark, ' +
  'fingers, hands, anatomical errors, flags, country symbols, political symbols, ' +
  'nsfw, cartoon, anime, illustration'

// ─── Item-spezifische Beschreibungen ─────────────────────────────────────────
// Regel: "Focus on <Gegenstand/Ergebnis>" — nie den Prozess beschreiben.
// FLUX schnell reagiert stark auf positiv formulierte Subjects.

const PROMPT_OVERRIDES = {
  // Klimaanlage
  'klimaanlage-installation': 'Focus on air condition unit mounted on wall',
  'klimaanlage-wartung':      'Focus on air condition unit mounted on wall',
  'klimaanlage-reparatur':    'Focus on air condition unit mounted on wall, tools on floor',
  // Bodenbelag
  'bodenbelag-verlegen':  'Focus on freshly installed wooden floor planks, clean interior',
  'parkett-schleifen':    'Focus on polished parquet floor, glossy surface, empty room',
  'fliesen-bodenbelag':   'Focus on freshly laid floor tiles, clean grout lines',
  // Dach
  'dach-reparatur':      'Focus on roof tiles and rooftop, clear sky',
  'dach-neudeckung':     'Focus on new roof tiles on house, clear sky',
  'dachrinne-reinigung': 'Focus on clean metal rain gutter on house exterior',
  // Elektro
  'elektroinstallation':      'Focus on electrical junction box mounted on wall, cables neatly arranged',
  'solaranlage-installation': 'Focus on solar panels on rooftop, sunny day',
  'smart-home-einrichtung':   'Focus on smart home control panel on wall, modern interior',
  // Fliesen
  'fliesenlegen-bad':    'Focus on freshly tiled bathroom wall, clean white tiles, modern bathroom',
  'fliesenlegen-aussen': 'Focus on outdoor terrace tiles, neat grout lines',
  'fliesenlegen-kueche': 'Focus on kitchen splashback tiles, modern kitchen',
  // Sanitär
  'rohrinstallation':     'Focus on copper pipes neatly installed under sink',
  'rohr-entstopfen':      'Focus on drain pipe and plumbing tools on white background',
  'wasserhahn-reparatur': 'Focus on modern chrome faucet, clean sink',
  // Malerarbeiten
  'innenraumstreichen': 'Focus on freshly painted interior wall, paint roller and tray nearby',
  'aussenstreichen':    'Focus on freshly painted house exterior wall, clean finish',
  'tapezieren':         'Wallpapering table with wallpaper roll and brush in empty room, freshly papered wall visible in background, no people',
  // Schlüssel & Schloss
  'schloss-einbau':       'Focus on modern door lock installed in wooden door, close-up',
  'schluessel-nachmachen': 'Focus on two metal door keys on white surface, close-up',
  // Reinigung
  'grundreinigung':   'Focus on clean bright room, mop and bucket in corner',
  'bueroreinigung':   'Focus on clean office desk, cleaning supplies nearby',
  'fensterreinigung': 'Focus on sparkling clean window, squeegee on glass',
  // Umzug & Transport
  'umzug-lokal':          'Moving boxes stacked in empty bright apartment, no people',
  'umzugshelfer-stunden': 'Focus on cardboard moving boxes neatly stacked, tape and marker nearby',
  'moebel-montage':       'Flat-pack furniture panels and parts laid out on wooden floor, screwdriver and Allen key beside them, instruction manual open, no people, no hands',
  'entrümpelung':         'Old furniture and junk piled up in a bright room, boxes and old chairs stacked, clearance scene, no people',
  // Büro & Recht
  'buchhaltung-monatlich':  'Focus on accounting documents, calculator and laptop on desk',
  'unternehmensgruendung':  'Focus on business registration documents, pen on desk, clean office',
  'mietrecht':              'Focus on rental contract document with pen on wooden desk',
  // Fotografie
  'event-fotografie':   'Focus on professional camera on tripod in event hall with lights',
  // IT & Tech
  'computer-reparatur':  'Open laptop on white table, screwdrivers and tools laid out beside it, no people',
  // Wellness & Massage
  'tiefengewebsmassage': 'Focus on massage table with white towels in calm spa room, candles',
  'sportmassage':        'Focus on massage table with white towels in bright therapy room',
  // Bildung
  'mathe-nachhilfe':    'Focus on open math textbook with notebook and pencil on desk',
  'allgemeine-nachhilfe': 'Focus on open books, notebook and pencil on bright study desk',
  // Beauty & Nails
  'pediküre':   'Focus on pedicure tools and nail polish bottles on white towel',
  'gel-naegel': 'Focus on UV nail lamp and gel polish bottles on white salon table',
  // Apotheke
  'freiverkaeufliche-medikamente': 'Focus on medicine boxes and pill blister packs on white surface',
  // Produkte — weißer Hintergrund Produktshot
  'smartphones':         'Three smartphones standing upright on white surface, screens facing forward, studio light, no people',
  'laptops-computer':    'Open laptop on white table, clean product shot, studio light, no people, screen showing abstract pattern',
  'tv-heimkino':         'Focus on flat screen TV on white background, clean product shot',
  'zement-beton':             'Concrete mixer and bags of cement on construction site, fresh concrete being poured, no people',
  'haushaltswaren-allgemein': 'Focus on assorted household items on clean white surface',
  'herrenkleidung':      'Focus on neatly folded mens shirt and chinos on white background',
  'damenkleidung':       'Focus on elegant womens dress on white background, soft light',
  'brettspiele':         'Focus on open board game with pieces and dice on wooden table',
  // Gastronomie
  'pizza-klassisch':    'Focus on whole margherita pizza on wooden board',
  'pizza-lieferung':    'Focus on open pizza box with fresh pizza inside',
  'burger':             'Focus on gourmet burger with fresh ingredients on wooden board',
  'sushi-rolls':        'Focus on fresh sushi rolls on slate plate, minimal setting',
  'kaffee-espresso':    'Focus on espresso cup with crema, cafe setting',
  'croissant-gebaeck':  'Focus on golden croissants on white plate, bakery setting',
  'souvlaki':           'Focus on souvlaki skewers on plate with pita bread',
  'grill-platte':       'Focus on grilled meat assortment on hot grill plate',
  'cocktails':          'Focus on colorful cocktail glass with garnish, bar setting',
  'frisches-brot':      'Focus on freshly baked bread loaf on wooden board',
  'torten-kuchen':      'Focus on decorated cake slice on white plate',
  'hochzeitstorte':     'Focus on elegant multi-tier wedding cake, white decoration',
  'fruehstueck-cafe':   'Focus on cafe breakfast spread, coffee cup, croissant and orange juice on table',
  'kuchen-torten':      'Focus on slice of layered cake on white plate, fork beside it',
  'grill-catering':     'Focus on outdoor grill station with grilled food on skewers, event setting',
  'tagesangebot':       'Focus on daily special plate with fresh cooked meal on restaurant table',
}

// ─── Args ─────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun:       args.includes('--dry-run'),
    skipExisting: args.includes('--skip-existing'),
    filterSlug:   (args.find(a => a.startsWith('--slug=')) ?? '').replace('--slug=', '') || null,
  }
}

// ─── CSV lesen ────────────────────────────────────────────────────────────────

function loadSeedItems() {
  const jsonPath = path.join(
    REPO_ROOT, '..', 'pundo_main_backend',
    'ingestor', 'lib', 'domain_template_items.json'
  )
  if (fs.existsSync(jsonPath)) {
    const domains = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    // Structure: [{domain_slug, items: [{slug, names: {en, de, ...}}]}]
    return domains.flatMap(d =>
      (d.items ?? []).map(i => ({
        slug:    i.slug,
        name_en: i.names?.en ?? i.slug,
      }))
    ).filter(i => i.slug)
  }

  // Fallback: seed_items.csv
  const csvPath = path.join(
    REPO_ROOT, '..', 'pundo_main_backend',
    'ingestor', 'lib', 'seed_items.csv'
  )
  if (fs.existsSync(csvPath)) {
    const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n')
    const headers = lines[0].split(',')
    const idx = h => headers.indexOf(h)
    return lines.slice(1).map(line => {
      const cols = line.split(',')
      return {
        slug:    cols[idx('slug')]?.trim(),
        name_en: cols[idx('name_en')]?.trim() ?? '',
      }
    }).filter(i => i.slug)
  }

  throw new Error('Neither domain_template_items.json nor seed_items.csv found.')
}

// ─── Prompt bauen ─────────────────────────────────────────────────────────────

function buildPrompt(item) {
  const subject = PROMPT_OVERRIDES[item.slug] ?? `Focus on ${item.name_en.toLowerCase()}`
  return `${STYLE_PREFIX}. ${subject}`
}

// ─── API-Call ─────────────────────────────────────────────────────────────────

async function generate(prompt, slug) {
  const body = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    steps: 4,
    cfg_scale: 1.0,
    width: 1024,
    height: 1024,
    seed: -1,
    sampler_name: 'DPM++ 2M Karras',
    batch_size: 1,
    n_iter: 1,
  }

  const res = await fetch(`${API_URL}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status} for ${slug}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  if (!data.images?.[0]) throw new Error(`No image returned for ${slug}`)

  return Buffer.from(data.images[0], 'base64')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun, skipExisting, filterSlug } = parseArgs()

  // Ping API
  try {
    const ping = await fetch(`${API_URL}/sdapi/v1/options`)
    if (!ping.ok) throw new Error()
    const opts = await ping.json()
    console.log(`DrawThings API online — model: ${opts.model ?? 'unknown'}`)
  } catch {
    console.error('ERROR: DrawThings API not reachable at localhost:7860')
    console.error('→ Open Draw Things → Einstellungen → Erweitert → API-Server starten → HTTP aktivieren')
    process.exit(1)
  }

  if (!fs.existsSync(MASTERS_DIR)) fs.mkdirSync(MASTERS_DIR, { recursive: true })

  let items = loadSeedItems()
  console.log(`Loaded ${items.length} seed items.`)

  if (filterSlug) {
    items = items.filter(i => i.slug === filterSlug)
    if (!items.length) throw new Error(`Slug not found: ${filterSlug}`)
  }

  if (skipExisting) {
    const before = items.length
    items = items.filter(i => !fs.existsSync(path.join(MASTERS_DIR, `${i.slug}.jpg`)))
    console.log(`Skipping ${before - items.length} existing master(s).`)
  }

  console.log(`\nGenerating ${items.length} image(s)${dryRun ? ' [DRY RUN]' : ''}...\n`)

  let ok = 0, failed = 0
  const errors = []

  for (const [i, item] of items.entries()) {
    const prompt = buildPrompt(item)
    const outPath = path.join(MASTERS_DIR, `${item.slug}.jpg`)
    const prefix = `[${String(i + 1).padStart(3, '0')}/${items.length}] ${item.slug}`

    if (dryRun) {
      console.log(`${prefix}  →  "${prompt.slice(0, 80)}..."`)
      ok++
      continue
    }

    process.stdout.write(`${prefix}  generating...`)
    try {
      const imgBuf = await generate(prompt, item.slug)
      fs.writeFileSync(outPath, imgBuf)
      const kb = Math.round(imgBuf.length / 1024)
      console.log(`  ✓  ${kb} KB`)
      ok++
    } catch (err) {
      console.log(`  ✗  ${err.message}`)
      errors.push({ slug: item.slug, error: err.message })
      failed++
    }

    // Kurze Pause zwischen Requests damit DrawThings nicht überlastet wird
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n=== Done: ${ok} ok, ${failed} failed ===`)
  if (errors.length) {
    console.log('\nFailed slugs:')
    errors.forEach(e => console.log(`  ${e.slug}: ${e.error}`))
  }
  if (!dryRun && ok > 0) {
    console.log(`\nNächster Schritt: npm run seed-visuals:build`)
  }
}

main().catch(err => {
  console.error(`\nFATAL: ${err.message}`)
  process.exit(1)
})
