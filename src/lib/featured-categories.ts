import fs from 'fs'
import path from 'path'

const FILE_PATH = path.join(process.cwd(), 'content', 'featured-categories.json')

interface FeaturedCategoryEntry { id: number; name?: string }
interface FeaturedCategoriesFile {
  comment?: string
  category_ids: FeaturedCategoryEntry[]
}

function loadFeaturedCategoryIds(): number[] | null {
  try {
    if (!fs.existsSync(FILE_PATH)) return null
    const raw = fs.readFileSync(FILE_PATH, 'utf-8')
    const data: FeaturedCategoriesFile = JSON.parse(raw)
    if (!Array.isArray(data.category_ids) || data.category_ids.length === 0) return null
    return data.category_ids.map(e => e.id)
  } catch {
    console.warn('[featured-categories] Steuerfile fehlt oder defekt — Fallback aktiv.')
    return null
  }
}

// Module-level cache — read once per process start (same pattern as guides.ts / blog.ts)
const FEATURED_IDS: number[] | null = loadFeaturedCategoryIds()

export function getFeaturedCategoryIds(): number[] | null {
  return FEATURED_IDS
}
