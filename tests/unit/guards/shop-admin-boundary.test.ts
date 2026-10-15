/**
 * Architektur-Guard "Shop-Admin Clean Boundary" (F8950 T33): `src/components/shop-admin/**`, `src/lib/shop-admin-api.ts`,
 * `src/lib/shop-admin-image-resize.ts` und `src/components/ui/TurnstileWidget.tsx` duerfen keine Customer-Module
 * importieren (`components/(map|product|search|shop)`, `@/lib/api`, `@/lib/translations`, `@/lib/lang` fuer das
 * Turnstile-Widget). Sonst waere die spaetere Auslagerung des Shop-Admins teuer. Ersetzt die Quelltext-Regex-Tests
 * einzelner Komponenten in `offer-item-photos.test.tsx` und `turnstile-widget.test.tsx`; der Guard prueft alle Dateien.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : []
  })
}

function imports(file: string): string[] {
  const src = readFileSync(file, 'utf8')
  return [...src.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
}

const CUSTOMER_COMPONENTS = /^@\/components\/(map|product|search|shop)\//
const CUSTOMER_LIB = /^@\/lib\/(api|translations)$/

const SHOP_ADMIN_FILES = [
  ...walk(join(ROOT, 'src/components/shop-admin')),
  join(ROOT, 'src/lib/shop-admin-api.ts'),
  join(ROOT, 'src/lib/shop-admin-image-resize.ts'),
]

describe('guard: Shop-Admin importiert nichts aus Customer-Code', () => {
  it('findet die Shop-Admin-Dateien (Guard laeuft nicht ins Leere)', () => {
    expect(SHOP_ADMIN_FILES.length).toBeGreaterThan(10)
  })

  it('keine Imports aus components/(map|product|search|shop) oder lib/(api|translations)', () => {
    const offenders = SHOP_ADMIN_FILES.flatMap((f) =>
      imports(f).filter((i) => CUSTOMER_COMPONENTS.test(i) || CUSTOMER_LIB.test(i)).map((i) => `${f.replace(ROOT + '/', '')} -> ${i}`),
    )
    expect(offenders).toEqual([])
  })

  it('TurnstileWidget (generisches UI-Primitiv) hat keine Customer-Imports (translations, lang)', () => {
    const bad = imports(join(ROOT, 'src/components/ui/TurnstileWidget.tsx'))
      .filter((i) => /^@\/lib\/(translations|lang)/.test(i))
    expect(bad).toEqual([])
  })
})
