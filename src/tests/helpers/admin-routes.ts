import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ADMIN_ROOT = join(process.cwd(), 'src/app/(system-admin)/admin')

const isGroup = (name: string) => /^\(.+\)$/.test(name)

function dirs(dir: string): string[] {
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory())
}

function resolve(dir: string, segments: string[], inPortal: boolean): boolean {
  if (segments.length === 0) return inPortal && existsSync(join(dir, 'page.tsx'))
  const [head, ...rest] = segments
  for (const name of dirs(dir)) {
    if (isGroup(name)) {
      if (resolve(join(dir, name), segments, inPortal || name === '(portal)')) return true
    } else if (!name.startsWith('[') && name === head && resolve(join(dir, name), rest, inPortal)) {
      return true
    }
  }
  return false
}

/** True if `href` (static, e.g. /admin/crm/contacts) is a page inside the (portal) group. Dynamic `[param]` folders never match. */
export function adminRouteExists(href: string): boolean {
  if (!href.startsWith('/admin/') && href !== '/admin') return false
  const segments = href.split('/').filter(Boolean).slice(1)
  return resolve(ADMIN_ROOT, segments, false)
}
