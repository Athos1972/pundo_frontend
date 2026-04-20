type InfoBoxType = 'tip' | 'warning' | 'info'

const infoBoxStyles: Record<InfoBoxType, { bg: string; border: string; icon: string }> = {
  tip: { bg: 'bg-green-50', border: 'border-green-300', icon: '💡' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-300', icon: '⚠️' },
  info: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'ℹ️' },
}

export function InfoBox({
  type = 'info',
  children,
}: {
  type?: InfoBoxType
  children: React.ReactNode
}) {
  const s = infoBoxStyles[type]
  return (
    <div className={`my-4 flex gap-3 rounded-xl border ${s.border} ${s.bg} p-4`}>
      <span className="shrink-0 text-lg leading-6">{s.icon}</span>
      <div className="text-sm leading-relaxed text-gray-800">{children}</div>
    </div>
  )
}

export function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="my-4 space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            {i + 1}
          </span>
          <span className="text-sm leading-6 text-gray-800">{step}</span>
        </li>
      ))}
    </ol>
  )
}

type CostTableRow = {
  item: string
  cost: string
  currency?: string
  note?: string
}

export function CostTable({ rows }: { rows: CostTableRow[] }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium">Position</th>
            <th className="pb-2 pr-4 font-medium">Kosten</th>
            <th className="pb-2 font-medium">Hinweis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 pr-4 text-gray-800">{row.item}</td>
              <td className="py-2 pr-4 font-medium text-gray-900">
                {row.cost}
                {row.currency ? ` ${row.currency}` : ''}
              </td>
              <td className="py-2 text-gray-500">{row.note ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const mdxComponents = { InfoBox, StepList, CostTable }
