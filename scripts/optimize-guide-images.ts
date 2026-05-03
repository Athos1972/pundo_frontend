/**
 * optimize-guide-images.ts
 *
 * CLI: tsx scripts/optimize-guide-images.ts [--dry-run] [--slug=<slug>] [--migrate-existing]
 *
 * Phase A — Standard run:
 *   Scans content/guides/_raw/ for PNGs/JPGs, encodes to AVIF + WebP in 3 widths,
 *   generates LQIP blur placeholder, writes manifest.
 *
 * Phase B — Migration run (--migrate-existing):
 *   Moves public/images/guides/*.{png,jpg} → content/guides/_raw/,
 *   then runs Phase A, then patches MDX frontmatter.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
import matter from 'gray-matter'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImageManifestEntry {
  width: number
  height: number
  blurDataURL: string
  formats: string[]
  widths: number[]
  hash: string
  source: string
}

type ImageManifest = Record<string, ImageManifestEntry>

// ─── Paths ───────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(path.dirname(process.argv[1] ?? process.cwd()), '..')
const RAW_DIR = path.join(REPO_ROOT, 'content', 'guides', '_raw')
const MANIFEST_PATH = path.join(REPO_ROOT, 'src', 'data', 'guide-image-manifest.json')
const OUTPUT_DIR = path.join(REPO_ROOT, 'public', 'images', 'guides')
const GUIDES_DIR = path.join(REPO_ROOT, 'content', 'guides')
const PUBLIC_GUIDES_DIR = path.join(REPO_ROOT, 'public', 'images', 'guides')

// ─── Arg Parsing ─────────────────────────────────────────────────────────────

function parseArgs(): { dryRun: boolean; slug?: string; migrateExisting: boolean } {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const migrateExisting = args.includes('--migrate-existing')
  const slugArg = args.find((a) => a.startsWith('--slug='))
  const slug = slugArg ? slugArg.replace('--slug=', '') : undefined
  return { dryRun, slug, migrateExisting }
}

// ─── Key / Prefix Derivation ─────────────────────────────────────────────────

/**
 * Derive manifest key from raw file path (relative to _raw/).
 *
 * _raw/mukhtar.png           → "mukhtar/hero"
 * _raw/mukhtar/schritt-2.png → "mukhtar/schritt-2"
 */
export function deriveManifestKey(relPath: string): string {
  const parts = relPath.split(path.sep)
  const basename = path.basename(relPath, path.extname(relPath))

  if (parts.length === 1) {
    // Top-level file: <slug>.png → <slug>/hero
    return `${basename}/hero`
  } else {
    // Subdirectory file: <slug>/<asset>.png → <slug>/<asset>
    const slug = parts[0]
    return `${slug}/${basename}`
  }
}

/**
 * Derive output filename prefix from manifest key.
 *
 * "mukhtar/hero"      → "mukhtar-hero"
 * "mukhtar/schritt-2" → "mukhtar-schritt-2"
 */
export function deriveOutputPrefix(key: string): string {
  return key.replace('/', '-')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath)
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex')
}

function readManifest(): ImageManifest {
  if (!fs.existsSync(MANIFEST_PATH)) return {}
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as ImageManifest
  } catch {
    return {}
  }
}

function writeManifest(manifest: ImageManifest, dryRun: boolean): void {
  const sorted: ImageManifest = {}
  for (const key of Object.keys(manifest).sort()) {
    sorted[key] = manifest[key]
  }
  const json = JSON.stringify(sorted, null, 2) + '\n'
  if (dryRun) {
    console.log('[dry-run] Would write manifest:', MANIFEST_PATH)
  } else {
    fs.writeFileSync(MANIFEST_PATH, json, 'utf-8')
    console.log('Wrote manifest:', MANIFEST_PATH)
  }
}

/** Scan _raw/ for *.png / *.jpg, recursing one level deep. */
function scanRaw(filterSlug?: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(RAW_DIR)) return results

  for (const entry of fs.readdirSync(RAW_DIR)) {
    const fullPath = path.join(RAW_DIR, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isFile() && /\.(png|jpg|jpeg)$/i.test(entry)) {
      const slug = path.basename(entry, path.extname(entry))
      if (!filterSlug || filterSlug === slug) {
        results.push(entry) // relative to _raw/
      }
    } else if (stat.isDirectory() && entry !== '.gitkeep') {
      if (!filterSlug || filterSlug === entry) {
        for (const sub of fs.readdirSync(fullPath)) {
          if (/\.(png|jpg|jpeg)$/i.test(sub)) {
            results.push(path.join(entry, sub)) // relative to _raw/
          }
        }
      }
    }
  }

  return results
}

// ─── Phase A: Encode ─────────────────────────────────────────────────────────

const TARGET_WIDTHS = [480, 960, 1600]
const AVIF_QUALITY = 60
const WEBP_QUALITY = 75

async function encodeImage(
  srcPath: string,
  relPath: string,
  manifest: ImageManifest,
  dryRun: boolean,
): Promise<void> {
  const key = deriveManifestKey(relPath)
  const prefix = deriveOutputPrefix(key)

  const hash = sha256File(srcPath)
  if (manifest[key]?.hash === hash) {
    console.log(`  skip (unchanged): ${key}`)
    return
  }

  if (dryRun) {
    console.log(`[dry-run] Would encode: ${srcPath} → key="${key}", prefix="${prefix}"`)
    return
  }

  console.log(`  encoding: ${key}`)

  const img = sharp(srcPath).rotate() // resolve EXIF orientation
  const metadata = await img.metadata()
  const sourceWidth = metadata.width ?? 1600
  const sourceHeight = metadata.height ?? 900

  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const actualWidths: number[] = []

  for (const w of TARGET_WIDTHS) {
    if (sourceWidth < w) {
      console.log(`    skip width ${w} (source only ${sourceWidth}px)`)
      continue
    }
    actualWidths.push(w)

    const avifOut = path.join(OUTPUT_DIR, `${prefix}-${w}.avif`)
    const webpOut = path.join(OUTPUT_DIR, `${prefix}-${w}.webp`)

    await img.clone().resize(w).avif({ quality: AVIF_QUALITY }).toFile(avifOut)
    console.log(`    wrote ${avifOut}`)

    await img.clone().resize(w).webp({ quality: WEBP_QUALITY }).toFile(webpOut)
    console.log(`    wrote ${webpOut}`)
  }

  // LQIP: 8×8 AVIF → base64
  const blurBuf = await img.clone().resize(8).avif({ quality: 30 }).toBuffer()
  const blurDataURL = `data:image/avif;base64,${blurBuf.toString('base64')}`

  manifest[key] = {
    width: sourceWidth,
    height: sourceHeight,
    blurDataURL,
    formats: ['avif', 'webp'],
    widths: actualWidths,
    hash,
    source: `_raw/${relPath}`,
  }
}

// ─── Phase B: Migration ───────────────────────────────────────────────────────

/**
 * Build a map from PNG basename (without extension) → guide folder slug.
 *
 * Scans all MDX files for lines like:
 *   ![alt](/images/guides/<pngBasename>.png)
 * and records which guide folder contains that MDX.
 *
 * This handles the legacy mismatches (e.g. katzen-rescue.png in the katzen-zypern guide).
 */
function buildPngToSlugMap(): Map<string, string> {
  const map = new Map<string, string>()
  const IMG_REGEX = /!\[([^\]]*)\]\(\/images\/guides\/([^)]+)\.(png|jpg)\)/im

  if (!fs.existsSync(GUIDES_DIR)) return map

  for (const guideSlug of fs.readdirSync(GUIDES_DIR)) {
    const guideDir = path.join(GUIDES_DIR, guideSlug)
    if (!fs.statSync(guideDir).isDirectory()) continue
    if (guideSlug === '_raw') continue

    for (const langFile of fs.readdirSync(guideDir)) {
      if (!langFile.endsWith('.mdx')) continue
      const mdxPath = path.join(guideDir, langFile)
      const raw = fs.readFileSync(mdxPath, 'utf-8')
      const parsed = matter(raw)
      const match = IMG_REGEX.exec(parsed.content)
      if (match) {
        const pngBasename = match[2] // e.g. "katzen-rescue"
        if (!map.has(pngBasename)) {
          map.set(pngBasename, guideSlug) // e.g. "katzen-rescue" → "katzen-zypern"
        }
        break // one MDX per guide is enough to determine the slug
      }
    }
  }
  return map
}

/**
 * Move public/images/guides/*.{png,jpg} → content/guides/_raw/
 * Renames the file to match the guide slug when there is a mismatch
 * (e.g. katzen-rescue.png → katzen-zypern.png in _raw/).
 *
 * Returns list of moved files (relative to _raw/).
 */
function moveExistingToRaw(dryRun: boolean): string[] {
  const moved: string[] = []
  if (!fs.existsSync(PUBLIC_GUIDES_DIR)) return moved

  const pngToSlug = buildPngToSlugMap()

  for (const file of fs.readdirSync(PUBLIC_GUIDES_DIR)) {
    if (!/\.(png|jpg|jpeg)$/i.test(file)) continue

    const src = path.join(PUBLIC_GUIDES_DIR, file)
    const ext = path.extname(file)
    const pngBasename = path.basename(file, ext)

    // Resolve canonical name: use guide slug if PNG basename differs
    const guideSlug = pngToSlug.get(pngBasename)
    const canonicalFile = guideSlug ? `${guideSlug}${ext}` : file

    const dest = path.join(RAW_DIR, canonicalFile)

    if (pngBasename !== path.basename(canonicalFile, ext)) {
      console.log(`  rename: ${file} → ${canonicalFile} (guide slug: ${guideSlug ?? 'unknown'})`)
    }

    const destExists = fs.existsSync(dest)
    if (destExists) {
      console.log(`  _raw/ already has ${canonicalFile}, skip move`)
      moved.push(canonicalFile)
      continue
    }

    if (dryRun) {
      console.log(`[dry-run] Would move: ${src} → ${dest}`)
    } else {
      fs.mkdirSync(RAW_DIR, { recursive: true })
      fs.renameSync(src, dest)
      console.log(`  moved: ${src} → ${dest}`)
    }
    moved.push(canonicalFile)
  }

  return moved
}

/**
 * Patch MDX files: for each MDX, if body contains
 *   ![<alt>](/images/guides/<slug>.(png|jpg))
 * on its own line, move alt → hero_alt in frontmatter and remove the line from body.
 *
 * Each language file gets its own alt from its own image line.
 */
function patchMdxFiles(dryRun: boolean): void {
  // Regex: matches a markdown image on its own line, referencing /images/guides/<name>.(png|jpg)
  // Group 1 = alt text, group 2 = image basename (without extension)
  const IMG_REGEX = /^!\[([^\]]*)\]\(\/images\/guides\/([^)]+)\.(png|jpg)\)\s*$/im

  if (!fs.existsSync(GUIDES_DIR)) return

  for (const guideSlug of fs.readdirSync(GUIDES_DIR)) {
    const guideDir = path.join(GUIDES_DIR, guideSlug)
    if (!fs.statSync(guideDir).isDirectory()) continue
    if (guideSlug === '_raw') continue

    for (const langFile of fs.readdirSync(guideDir)) {
      if (!langFile.endsWith('.mdx')) continue

      const mdxPath = path.join(guideDir, langFile)
      const raw = fs.readFileSync(mdxPath, 'utf-8')
      const parsed = matter(raw)

      const match = IMG_REGEX.exec(parsed.content)
      if (!match) continue

      const altText = match[1]
      // match[2] is the image name without extension (e.g. "mukhtar")

      const newData = { ...parsed.data }
      if (!newData.hero_alt) {
        newData.hero_alt = altText
      }

      // Remove the matched image line (and any immediately surrounding blank lines)
      let newContent = parsed.content.replace(IMG_REGEX, '')
      // Collapse multiple consecutive blank lines into at most one
      newContent = newContent.replace(/\n{3,}/g, '\n\n')

      const newRaw = matter.stringify(newContent, newData)

      if (dryRun) {
        console.log(`[dry-run] Would patch: ${mdxPath}`)
        console.log(`          hero_alt: "${altText}"`)
      } else {
        fs.writeFileSync(mdxPath, newRaw, 'utf-8')
        console.log(`  patched: ${mdxPath} (hero_alt: "${altText}")`)
      }
    }
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { dryRun, slug, migrateExisting } = parseArgs()

  if (dryRun) console.log('=== DRY RUN — no files will be written ===\n')

  const manifest = readManifest()

  // Phase B: move existing PNGs from public/ to _raw/
  if (migrateExisting) {
    console.log('\n--- Phase B: Move existing public/*.{png,jpg} → _raw/ ---')
    moveExistingToRaw(dryRun)
  }

  // Phase A: scan _raw/, encode
  console.log('\n--- Phase A: Encode _raw/ sources ---')
  const sources = scanRaw(slug)

  if (sources.length === 0) {
    console.log('No source files found in content/guides/_raw/. Nothing to do.')
  }

  // Check for manifest key collisions before encoding
  const keysSeen = new Map<string, string>()
  for (const relPath of sources) {
    const key = deriveManifestKey(relPath)
    if (keysSeen.has(key)) {
      console.error(
        `ERROR: Manifest key collision for "${key}": "${keysSeen.get(key)}" vs "${relPath}"`,
      )
      process.exit(1)
    }
    keysSeen.set(key, relPath)
  }

  for (const relPath of sources) {
    const srcPath = path.join(RAW_DIR, relPath)
    await encodeImage(srcPath, relPath, manifest, dryRun)
  }

  if (!dryRun && sources.length > 0) {
    writeManifest(manifest, false)
  } else if (dryRun && sources.length > 0) {
    writeManifest(manifest, true)
  }

  // Phase B continued: patch MDX files
  if (migrateExisting) {
    console.log('\n--- Phase B: Patch MDX frontmatter ---')
    patchMdxFiles(dryRun)
  }

  console.log('\nDone.')
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
