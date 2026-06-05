import { getImageMeta } from '@/lib/guide-images'

interface GuideImageProps {
  slug: string // Guide slug
  asset: string // Asset name (e.g. "schritt-2")
  alt: string
}

// Uses native <picture> instead of next/image — same reason as GuideHeroImage:
// images are pre-encoded, next/image optimizer would re-process them unnecessarily.
export function GuideImage({ slug, asset, alt }: GuideImageProps) {
  const m = getImageMeta(`${slug}/${asset}`)
  const base = `/images/guides/${slug}-${asset}`
  const widths = m.widths

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
        loading="lazy"
        // @csp-allow-inline-style — dynamic blurDataURL as background-image, no Tailwind equivalent
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: '0.5rem',
          backgroundImage: `url(${m.blurDataURL})`,
          backgroundSize: 'cover',
        }}
        className="my-4 w-full h-auto rounded-lg"
      />
    </picture>
  )
}
