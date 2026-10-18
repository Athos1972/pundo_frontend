// Only imports from src/components/ui/ allowed (Clean Boundary)
import { AdminNav } from './AdminNav'
import { ToastProvider } from './Toast'
import { UnverifiedOffersBanner } from './UnverifiedOffersBanner'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface AdminShellProps {
  children: React.ReactNode
  tr: ShopAdminTranslations
  ownerName: string
  reviewsNewCount?: number
  /** F5970: offers waiting for the new owner's confirmation (banner is hidden at 0) */
  unverifiedOffersCount?: number
}

export function AdminShell({ children, tr, ownerName, reviewsNewCount, unverifiedOffersCount }: AdminShellProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <AdminNav tr={tr} ownerName={ownerName} reviewsNewCount={reviewsNewCount} />
      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
        <UnverifiedOffersBanner count={unverifiedOffersCount ?? 0} tr={tr} />
        {children}
      </main>
      <ToastProvider />
    </div>
  )
}
