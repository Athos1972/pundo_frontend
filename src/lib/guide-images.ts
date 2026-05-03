import manifestJson from '@/data/guide-image-manifest.json'

export interface GuideImageMeta {
  width: number
  height: number
  blurDataURL: string
  formats: string[]
  widths: number[]
  hash: string
  source: string
}

const MANIFEST = manifestJson as Record<string, GuideImageMeta>

export function getImageMeta(key: string): GuideImageMeta {
  const m = MANIFEST[key]
  if (!m) {
    throw new Error(
      `[guides] Missing image manifest entry for "${key}". ` +
        `Place the source file in content/guides/_raw/ and run \`npm run guides:optimize\`.`,
    )
  }
  return m
}

export function hasImageMeta(key: string): boolean {
  return key in MANIFEST
}
