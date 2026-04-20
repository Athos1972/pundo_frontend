import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getCustomerSession, getSpottedUploads } from '@/lib/customer-api'
import type { SpottedUpload } from '@/types/api'

export const metadata: Metadata = { title: 'My Spotted Uploads | Pundo' }

function statusLabel(
  status: SpottedUpload['status'],
  tr: ReturnType<typeof t>,
): string {
  if (status === 'pending') return tr.spotted_account_status_pending
  if (status === 'successful') return tr.spotted_account_status_successful
  return tr.spotted_account_status_rejected
}

function statusColor(status: SpottedUpload['status']): string {
  if (status === 'pending') return 'text-yellow-600 bg-yellow-50'
  if (status === 'successful') return 'text-green-700 bg-green-50'
  return 'text-red-600 bg-red-50'
}

function errorLabel(reason: string | null | undefined, tr: ReturnType<typeof t>): string {
  if (reason === 'no_shop') return tr.spotted_account_error_no_shop
  if (reason === 'vision_failed') return tr.spotted_account_error_vision_failed
  return reason ?? ''
}

export default async function SpottedAccountPage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const session = await getCustomerSession(lang)

  if (!session.is_authenticated) {
    redirect('/auth/login')
  }

  let uploads: SpottedUpload[] = []
  try {
    const res = await getSpottedUploads(lang)
    uploads = res.spotted
  } catch {
    // show empty state on error
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1
          className="text-2xl font-extrabold text-text mb-6"
          style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}
        >
          {tr.spotted_account_title}
        </h1>

        {uploads.length === 0 ? (
          <p className="text-text-muted text-sm">{tr.spotted_account_empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {uploads.map((upload) => (
              <li
                key={upload.spotted_id}
                className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(upload.status)}`}
                  >
                    {statusLabel(upload.status, tr)}
                  </span>
                  <time className="text-xs text-text-muted" dateTime={upload.created_at}>
                    {new Date(upload.created_at).toLocaleDateString(lang)}
                  </time>
                </div>

                {upload.shop && (
                  <p className="text-sm text-text font-medium">{upload.shop.shop_name}</p>
                )}

                {upload.product && (
                  <p className="text-sm text-text-muted">{upload.product.product_name}</p>
                )}

                {upload.detected_price != null && upload.detected_currency && (
                  <p className="text-sm font-semibold text-accent">
                    {upload.detected_price} {upload.detected_currency}
                  </p>
                )}

                {upload.status === 'rejected' && upload.error_reason && (
                  <p className="text-xs text-red-600">
                    {errorLabel(upload.error_reason, tr)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
