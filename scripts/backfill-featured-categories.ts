/**
 * Backfill script: populates content/featured-categories.json with all currently
 * populated Google categories from the backend.
 *
 * Usage: npm run backfill:categories
 *
 * Overwrites any existing file. Manually curate the result afterwards as needed.
 */

import fs from 'fs'
import path from 'path'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8500'
const OUTPUT_PATH = path.join(process.cwd(), 'content', 'featured-categories.json')

// Priority order matching CategoryChips.tsx — applied before alphabetical sort.
const PRIORITY_ORDER = [
  'Pet Supplies',
  'Dog Supplies',
  'Cat Supplies',
  'Bird Supplies',
  'Fish Supplies',
  'Small Animal Supplies',
  'Reptile Supplies',
  'Dog',
  'Cat',
  'Bird',
  'Fish',
  'Small Animal',
  'Reptile',
]

function getPriority(name: string | null): number {
  if (!name) return 99
  const lower = name.toLowerCase()
  const idx = PRIORITY_ORDER.findIndex(p => lower.includes(p.toLowerCase()))
  return idx === -1 ? 99 : idx
}

interface CategoryItem {
  id: number
  name: string | null
  external_id: string
}

interface CategoryListResponse {
  items: CategoryItem[]
}

async function main() {
  const url = `${BACKEND_URL}/api/v1/categories?taxonomy_type=google&only_with_products=true&limit=200`
  console.log(`Fetching categories from ${url} …`)

  let data: CategoryListResponse
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    data = await res.json() as CategoryListResponse
  } catch (err) {
    console.error('[backfill-featured-categories] Backend nicht erreichbar:', err)
    process.exit(1)
  }

  const sorted = [...data.items].sort((a, b) => {
    const pa = getPriority(a.name)
    const pb = getPriority(b.name)
    if (pa !== pb) return pa - pb
    return (a.name ?? a.external_id).localeCompare(b.name ?? b.external_id)
  })

  const output = {
    comment: "Redaktionell kuratierte Homepage-Kategorien. category_ids in Anzeige-Reihenfolge. Pflege via 'npm run backfill:categories' oder manuell.",
    category_ids: sorted.map(c => ({ id: c.id, name: c.name ?? c.external_id })),
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8')
  console.log(`✓ ${sorted.length} Kategorien geschrieben → ${OUTPUT_PATH}`)
}

main()
