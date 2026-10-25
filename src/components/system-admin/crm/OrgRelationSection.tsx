'use client'
// ─── Client bridge for the contact persons of an organisation (F7600, org cut) ───────────────────────────────────────
// The org detail page is a Server Component and cannot pass a function prop; OrgRelationList (T16 person components)
// takes `onChanged`. This bridge supplies it: after any change the server data of the page is reloaded.

import { useRouter } from 'next/navigation'
import { OrgRelationList } from './OrgRelationList'
import type { CrmOrgDetail } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface OrgRelationSectionProps {
  org: CrmOrgDetail
  tr: SysAdminTranslations
  canWrite: boolean
  canSetTier: boolean
}

export function OrgRelationSection({ org, tr, canWrite, canSetTier }: OrgRelationSectionProps) {
  const router = useRouter()
  return <OrgRelationList org={org} tr={tr} canWrite={canWrite} canSetTier={canSetTier} onChanged={() => router.refresh()} />
}
