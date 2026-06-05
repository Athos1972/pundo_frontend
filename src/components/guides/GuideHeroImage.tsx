import { getImageMeta } from '@/lib/guide-images'

interface GuideHeroImageProps {
  slug: string // Manifest-Key-Prefix, same as meta.slug
  alt: string // from meta.hero_alt
  priority?: boolean // true for above-the-fold (LCP-relevant)
}

// Uses native <picture> instead of next/image to avoid double-optimization:
// our images are already pre-encoded to AVIF/WebP by guides:optimize.
// next/image would run Sharp on them again in dev mode → CPU spike.
export function GuideHeroImage({ slug, alt, priority = false }: GuideHeroImageProps) {
  const m = getImageMeta(`${slug}/hero`)
  const base = `/images/guides/${slug}-hero`
  const widths = m.widths // e.g. [480, 960, 1600]

  const avifSrcSet = widths.map(w => `${base}-${w}.avif ${w}w`).join(', ')
  const webpSrcSet = widths.map(w => `${base}-${w}.webp ${w}w`).join(', ')
  const fallbackSrc = `${base}-${widths[widths.length - 1]}.webp`

  return (
    <picture>
      <source srcSet={avifSrcSet} type="image/avif" sizes="(max-width: 480px) 480px, (max-width: 960px) 960px, 1600px" />
      <source srcSet={webpSrcSet} type="image/webp" sizes="(max-width: 480px) 480px, (max-width: 960px) 960px, 1600px" />
      <img
        src={fallbackSrc}
        alt={alt}
        width={m.width}
        height={m.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        // @csp-allow-inline-style — dynamic blurDataURL as background-image, no Tailwind equivalent
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '0.75rem',
          backgroundImage: `url(${m.blurDataURL})`,
          backgroundSize: 'cover',
        }}
        className="w-full h-auto rounded-xl"
      />
    </picture>
  )
}
