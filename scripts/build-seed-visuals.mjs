/**
 * build-seed-visuals.mjs
 *
 * CLI: node scripts/build-seed-visuals.mjs [--dry-run] [--slug=<slug>]
 *
 * Reads:  public/seed-visuals/_masters/<slug>.jpg  (1024×1024 square from DrawThings)
 * Writes: public/seed-visuals/<slug>.webp           (1024×1024, q=82)
 *         public/seed-visuals/<slug>.jpg            (1024×1024, q=85)
 *         public/seed-visuals/<slug>-og.webp        (1200×630, center-crop, q=82)
 * Also writes: public/seed-visuals/_manifest.json
 *
 * Hard-fails on:
 *   - Slug collision (two masters with same derived slug)
 *   - Output file > 200 KB after compression
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

// ─── Paths ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const MASTERS_DIR = path.join(REPO_ROOT, 'public', 'seed-visuals', '_masters')
const OUTPUT_DIR = path.join(REPO_ROOT, 'public', 'seed-visuals')
const MANIFEST_PATH = path.join(OUTPUT_DIR, '_manifest.json')

const CARD_SIZE = 1024  // square 1:1
const OG_WIDTH = 1200
const OG_HEIGHT = 630
const WEBP_QUALITY = 82
const JPG_QUALITY = 85
const MAX_BYTES = 200 * 1024 // 200 KB

// ─── Arg Parsing ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const slugArg = args.find((a) => a.startsWith('--slug='))
  const filterSlug = slugArg ? slugArg.replace('--slug=', '') : undefined
  return { dryRun, filterSlug }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256File(filePath) {
  const data = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(data).digest('hex')
}

function slugFromMaster(masterPath) {
  return path.basename(masterPath, path.extname(masterPath))
}

function logStep(msg) {
  console.log(`  ${msg}`)
}

// ─── Core ─────────────────────────────────────────────────────────────────────

async function processMaster(masterPath, dryRun) {
  const slug = slugFromMaster(masterPath)

  const cardWebpPath = path.join(OUTPUT_DIR, `${slug}.webp`)
  const cardJpgPath = path.join(OUTPUT_DIR, `${slug}.jpg`)
  const ogWebpPath = path.join(OUTPUT_DIR, `${slug}-og.webp`)

  logStep(`Processing: ${slug}`)

  if (dryRun) {
    logStep(`  [dry-run] would write: ${slug}.webp, ${slug}.jpg, ${slug}-og.webp`)
    return null
  }

  // Card WebP (1024×1024 square)
  await sharp(masterPath)
    .resize(CARD_SIZE, CARD_SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: WEBP_QUALITY })
    .toFile(cardWebpPath)

  // Card JPG (1024×1024 square)
  await sharp(masterPath)
    .resize(CARD_SIZE, CARD_SIZE, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: JPG_QUALITY, progressive: true })
    .toFile(cardJpgPath)

  // OG WebP (1200×630, center crop)
  await sharp(masterPath)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' })
    .webp({ quality: WEBP_QUALITY })
    .toFile(ogWebpPath)

  // Size checks
  const bytesWebp = fs.statSync(cardWebpPath).size
  const bytesJpg = fs.statSync(cardJpgPath).size
  const bytesOg = fs.statSync(ogWebpPath).size

  if (bytesWebp > MAX_BYTES) {
    throw new Error(
      `[seed-visuals] ${slug}.webp is ${bytesWebp} bytes (> ${MAX_BYTES}). ` +
        `Reduce quality or resolution.`,
    )
  }
  if (bytesJpg > MAX_BYTES) {
    throw new Error(
      `[seed-visuals] ${slug}.jpg is ${bytesJpg} bytes (> ${MAX_BYTES}). ` +
        `Reduce quality or resolution.`,
    )
  }
  if (bytesOg > MAX_BYTES) {
    throw new Error(
      `[seed-visuals] ${slug}-og.webp is ${bytesOg} bytes (> ${MAX_BYTES}). ` +
        `Reduce quality or resolution.`,
    )
  }

  const sha256Webp = sha256File(cardWebpPath)

  logStep(`  OK  card=${bytesWebp}B  jpg=${bytesJpg}B  og=${bytesOg}B`)

  return {
    slug,
    sha256_webp: sha256Webp,
    bytes_webp: bytesWebp,
    bytes_jpg: bytesJpg,
    bytes_og: bytesOg,
  }
}

async function main() {
  const { dryRun, filterSlug } = parseArgs()

  console.log(`\n=== build-seed-visuals ${dryRun ? '[DRY RUN] ' : ''}===\n`)

  if (!fs.existsSync(MASTERS_DIR)) {
    console.log('No _masters/ directory found. Nothing to process.')
    console.log('Place 1024×1024 JPEG masters in public/seed-visuals/_masters/<slug>.jpg')
    return
  }

  // Collect master files
  let masterFiles = fs
    .readdirSync(MASTERS_DIR)
    .filter((f) => /\.(jpg|jpeg)$/i.test(f))
    .map((f) => path.join(MASTERS_DIR, f))

  if (filterSlug) {
    masterFiles = masterFiles.filter((f) => slugFromMaster(f) === filterSlug)
    if (masterFiles.length === 0) {
      throw new Error(`[seed-visuals] No master found for slug: ${filterSlug}`)
    }
  }

  if (masterFiles.length === 0) {
    console.log('No master files found in _masters/. Nothing to process.')
    return
  }

  // Duplicate slug check
  const slugsSeen = new Set()
  for (const f of masterFiles) {
    const slug = slugFromMaster(f)
    if (slugsSeen.has(slug)) {
      throw new Error(
        `[seed-visuals] Slug collision detected: "${slug}" appears more than once in _masters/. ` +
          `Slugs must be unique across all template domains.`,
      )
    }
    slugsSeen.add(slug)
  }

  console.log(`Found ${masterFiles.length} master(s).\n`)

  const results = []

  for (const masterPath of masterFiles) {
    const result = await processMaster(masterPath, dryRun)
    if (result) results.push(result)
  }

  if (!dryRun) {
    // Load existing manifest (to merge with other slugs not reprocessed in this run)
    let existing = []
    if (!filterSlug && fs.existsSync(MANIFEST_PATH)) {
      try {
        const prev = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
        existing = prev.items ?? []
      } catch {
        // ignore parse errors — rebuild from scratch
      }
    } else if (filterSlug && fs.existsSync(MANIFEST_PATH)) {
      // Merge: keep all other slugs, replace the filtered one
      try {
        const prev = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
        existing = (prev.items ?? []).filter((item) => item.slug !== filterSlug)
      } catch {
        existing = []
      }
    }

    const allItems = [...existing, ...results].sort((a, b) => a.slug.localeCompare(b.slug))

    const manifest = {
      generated_at: new Date().toISOString(),
      total: allItems.length,
      items: allItems,
    }

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    console.log(`\nManifest written: ${allItems.length} slug(s) → ${MANIFEST_PATH}`)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`)
  process.exit(1)
})
