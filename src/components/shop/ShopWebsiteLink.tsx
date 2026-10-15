import { GlobeIcon } from '@/components/ui/GlobeIcon'
import { getHostname } from '@/lib/utils'
import { sanitizeExternalUrl } from '@/lib/url-safety'

/**
 * Shop website link for customers. Renders only http(s) URLs (defence in depth on top of the
 * backend validation): javascript:, data: etc. render nothing. Hostname-less values render nothing too.
 * Values without a scheme ("www.shop.cy", older data) get https:// — same rule as the backend
 * (normalize_http_url) — instead of becoming a relative link or disappearing.
 */
export function ShopWebsiteLink({ url }: { url: string | null | undefined }) {
  const href = sanitizeExternalUrl(withHttpsIfSchemeless(url))
  const host = href ? getHostname(href) : null
  if (!href || !host) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-accent hover:opacity-80"
    >
      <GlobeIcon size={15} />
      {host}
    </a>
  )
}

// "host.tld[/…]" without any scheme → https://host.tld[/…]; anything with a scheme (incl. javascript:) is left as is.
function withHttpsIfSchemeless(url: string | null | undefined): string | null | undefined {
  const v = url?.trim()
  if (!v || /^[a-z][a-z0-9+.-]*:/i.test(v)) return v
  return /^[\w-]+(\.[\w-]+)+([/?#:]|$)/.test(v) ? `https://${v}` : v
}
