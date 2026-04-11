import { redirect } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getCustomerSession, getReviews } from '@/lib/customer-api'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import type { Review } from '@/types/api'
import { BackButton } from '@/components/ui/BackButton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account | Pundo' }

export default async function AccountPage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const session = await getCustomerSession(lang)

  if (!session.is_authenticated || !session.user) {
    redirect('/auth/login')
  }

  const user = session.user

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackButton />

        <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
          <h1
            className="text-xl font-extrabold text-text mb-1"
            style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
          >
            {user.display_name}
          </h1>
          <p className="text-sm text-text-muted">{user.email}</p>
        </div>

        <h2
          className="font-bold text-sm text-text mb-3"
          style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
        >
          {tr.auth_my_reviews}
        </h2>

        <AccountReviews userId={user.id} lang={lang} tr={tr} />
      </div>
    </main>
  )
}

// Separate async component so it can be wrapped in Suspense later if needed
async function AccountReviews({
  userId,
  lang,
  tr,
}: {
  userId: number
  lang: string
  tr: ReturnType<typeof t>
}) {
  // Fetch all reviews the user wrote — we use a generic search on user_id via the admin endpoint
  // For now we surface an empty state; real implementation needs a /customer/reviews/mine endpoint
  // ⚠️ ANNAHME: Backend hat /api/v1/customer/reviews/mine — falls nicht vorhanden, leer anzeigen
  const reviews = await fetchMyReviews(lang)

  if (reviews.length === 0) {
    return <p className="text-sm text-text-muted">{tr.reviews_no_reviews}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {(reviews as Review[]).map((r) => (
        <ReviewCard key={r.id} review={r} tr={tr} lang={lang} />
      ))}
    </div>
  )
}

async function fetchMyReviews(lang: string) {
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
