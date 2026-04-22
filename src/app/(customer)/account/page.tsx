import { redirect } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { getCustomerSession } from '@/lib/customer-api'
import { getTrustProfile } from '@/lib/community-api'
import { BackButton } from '@/components/ui/BackButton'
import { AccountTabs } from '@/components/account/AccountTabs'
import type { Metadata } from 'next'
import type { Review } from '@/types/api'
import type { LinkedAccountsResponse } from '@/types/customer'

export const metadata: Metadata = { title: 'Account | Pundo' }

export default async function AccountPage() {
  const lang = await getLangServer()
  const session = await getCustomerSession(lang)

  if (!session.is_authenticated || !session.user) {
    redirect('/auth/login')
  }

  const user = session.user

  const [reviews, linkedAccounts, trustProfile] = await Promise.all([
    fetchMyReviews(lang),
    fetchLinkedAccounts(lang),
    getTrustProfile(lang),
  ])

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <BackButton />

        <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
          <h1
            className="text-xl font-extrabold text-text mb-1 font-heading"
          >
            {user.display_name}
          </h1>
          <p className="text-sm text-text-muted">{user.email}</p>
        </div>

        <AccountTabs
          initialUser={user}
          linkedAccounts={linkedAccounts}
          reviews={reviews}
          trustProfile={trustProfile}
          lang={lang}
        />
      </div>
    </main>
  )
}

async function fetchMyReviews(lang: string): Promise<Review[]> {
  const { cookies } = await import('next/headers')
  const store = await cookies()
  const token = store.get('customer_token')?.value
  const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'

  try {
    const res = await fetch(`${BACKEND}/api/v1/customer/reviews/mine`, {
      headers: {
        'Accept-Language': lang,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchLinkedAccounts(lang: string): Promise<LinkedAccountsResponse | null> {
  const { cookies } = await import('next/headers')
  const store = await cookies()
  const token = store.get('customer_token')?.value
  const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'

  try {
    const res = await fetch(`${BACKEND}/api/v1/customer/auth/linked-accounts`, {
      headers: {
        'Accept-Language': lang,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
