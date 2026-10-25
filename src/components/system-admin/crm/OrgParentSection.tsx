// ─── CRM head office / branches (F7600, org cut, Design §6b) ──────────────────────────────────────────────────────────
// Server/UI component (pure display). A branch shows "Belongs to: <head office>" with a link, a head office lists its
// branches "Branches (n)" (AC 42). One level only, nothing is inherited. Renders nothing for an organisation that is
// neither. The backend caps `children.items` at 100; `children.count` is the real number.

import Link from 'next/link'
import type { CrmOrgDetail } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface OrgParentSectionProps {
  org: Pick<CrmOrgDetail, 'parent' | 'children'>
  tr: SysAdminTranslations
}

export function OrgParentSection({ org, tr }: OrgParentSectionProps) {
  const { parent, children } = org
  if (!parent && children.count === 0) return null
  const more = children.count - children.items.length

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5" data-testid="crm-org-parent">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">{tr.crm_parent_title}</h2>
      {parent && (
        <p className="text-sm text-gray-700">
          {tr.crm_parent_belongs_to}:{' '}
          <Link href={`/admin/crm/orgs/${parent.id}`} className="font-medium text-slate-700 underline">
            {parent.name}
          </Link>
        </p>
      )}
      {children.count > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm text-gray-700">{tr.crm_parent_branches.replace('{n}', String(children.count))}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {children.items.map((child) => (
              <li key={child.id}>
                <Link href={`/admin/crm/orgs/${child.id}`} className="text-slate-700 underline">{child.name}</Link>
              </li>
            ))}
          </ul>
          {more > 0 && <p className="text-xs text-gray-500">{tr.crm_parent_more.replace('{n}', String(more))}</p>}
        </div>
      )}
    </section>
  )
}
