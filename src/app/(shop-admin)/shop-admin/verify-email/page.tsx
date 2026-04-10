import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ token?: string }>
}

async function verifyToken(token: string): Promise<{ ok: boolean }> {
  try {
    const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8001'
    const res = await fetch(`${BACKEND}/api/v1/shop-owner/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const lang = await getLangServer()
  const tr = tAdmin(lang)
  const { token } = await searchParams

  let success = false
  if (token) {
    const result = await verifyToken(token)
    success = result.ok
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center flex flex-col gap-4">
        <h1 className="text-xl font-bold text-gray-900">{tr.verify_title}</h1>
        {!token ? (
          <p className="text-gray-500 text-sm">{tr.verify_error}</p>
        ) : success ? (
          <>
            <p className="text-green-700 text-sm">{tr.verify_success}</p>
            <Link
              href="/shop-admin/pending-approval"
              className="inline-block mt-2 bg-accent text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors"
            >
              {tr.pending_title}
            </Link>
          </>
        ) : (
          <p className="text-red-600 text-sm">{tr.verify_error}</p>
        )}
      </div>
    </div>
  )
}
