import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { cookies } from 'next/headers'
import type { AdminReview } from '@/types/shop-admin'
import { ReviewModerationTable } from '@/components/shop-admin/ReviewModerationTable'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'

async function getAdminReviews(lang: string): Promise<AdminReview[]> {
  const store = await cookies()
  const token = store.get('admin_token')?.value ?? store.get('shop_owner_token')?.value

  try {
    const res = await fetch(`${BACKEND}/api/v1/admin/reviews?limit=100`, {
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

export default async function ReviewsPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)
  const reviews = await getAdminReviews(lang)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">{tr.reviews_title}</h1>
      <ReviewModerationTable reviews={reviews} tr={tr} />
    </div>
  )
}
