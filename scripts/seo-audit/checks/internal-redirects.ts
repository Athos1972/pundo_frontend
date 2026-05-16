/**
 * Global check: Internal links that point to 3xx redirects (AC-33)
 *
 * Collects { source_page, link_target, http_status, final_url } for every
 * internal <a href> that returns a 3xx response.
 */

export interface InternalRedirect {
  source_page: string
  link_target: string
  http_status: number
  final_url: string
}

/**
 * Check a single internal link for redirects.
 * Uses fetch with redirect: 'follow' to get the final URL, then one more
 * request with redirect: 'manual' to capture the status code.
 */
export async function checkInternalLink(
  sourcePage: string,
  linkTarget: string,
  fetchFn: (url: string, opts?: RequestInit) => Promise<Response>,
  timeoutMs = 8_000,
): Promise<InternalRedirect | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetchFn(linkTarget, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (res.status >= 300 && res.status < 400) {
      const finalUrl = res.headers.get('location') ?? linkTarget
      return {
        source_page: sourcePage,
        link_target: linkTarget,
        http_status: res.status,
        final_url: finalUrl,
      }
    }
    return null
  } catch {
    return null
  }
}

export function formatInternalRedirectsSection(
  redirects: InternalRedirect[],
  accepted: string[],
): string {
  const acceptedSet = new Set(accepted)
  const filtered = redirects.filter(
    (r) => !acceptedSet.has(`${r.link_target}→${r.final_url}`),
  )

  const lines = [
    '## Internal links pointing to redirects',
    '',
  ]
  if (filtered.length === 0) {
    lines.push('> No internal links to redirects found.')
  } else {
    lines.push(`> ${filtered.length} internal link(s) point to redirect URLs.`)
    lines.push('')
    lines.push('| Source page | Link target | Status | Final URL |')
    lines.push('|---|---|---|---|')
    for (const r of filtered) {
      lines.push(`| ${r.source_page} | ${r.link_target} | ${r.http_status} | ${r.final_url} |`)
    }
  }
  if (accepted.length > 0) {
    lines.push('')
    lines.push(`> Accepted redirects (whitelisted): ${accepted.join(', ')}`)
  }
  lines.push('')
  return lines.join('\n')
}
