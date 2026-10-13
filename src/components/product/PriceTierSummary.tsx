// Server Component — F5200 Staffelblock unter der Preiszeile
import type { TierRow } from '@/lib/price-tiers'
import { formatTierRow } from '@/lib/price-tiers'
import { t } from '@/lib/translations'

function Row({ row, tr }: { row: TierRow; tr: ReturnType<typeof t> }) {
  const f = formatTierRow(row, tr)
  return (
    <li>
      {f.prefix && (
        <>
          <bdi>{f.prefix}</bdi>
          {': '}
        </>
      )}
      <bdi>{f.amount}</bdi>
      {f.suffix && <span>{' / '}{f.suffix}</span>}
    </li>
  )
}

export function PriceTierSummary({ rows, lang }: { rows: TierRow[]; lang: string }) {
  if (rows.length === 0) return null
  const tr = t(lang)
  const visible = rows.slice(0, 3)
  const rest = rows.slice(3)
  return (
    <ul aria-label={tr.tier_prices_label} className="mt-1 space-y-0.5 text-xs text-text-muted text-end">
      {visible.map((r, i) => (
        <Row key={i} row={r} tr={tr} />
      ))}
      {rest.length > 0 && (
        <li className="list-none">
          <details>
            <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-accent rounded">
              {tr.tier_show_all(rows.length)}
            </summary>
            <ul className="space-y-0.5">
              {rest.map((r, i) => (
                <Row key={i} row={r} tr={tr} />
              ))}
            </ul>
          </details>
        </li>
      )}
    </ul>
  )
}
