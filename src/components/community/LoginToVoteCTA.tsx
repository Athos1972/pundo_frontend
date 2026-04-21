'use client'

import Link from 'next/link'
import type { Translations } from '@/lib/translations'

interface Props {
  tr: Translations
}

export function LoginToVoteCTA({ tr }: Props) {
  return (
    <p className="text-sm text-text-muted rtl:text-right">
      <Link href="/auth/login" className="text-accent hover:underline font-medium">
        {tr.auth_login}
      </Link>{' '}
      {tr.community_votes_login_cta.replace(tr.auth_login, '').trim()}
    </p>
  )
}
