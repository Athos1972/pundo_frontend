// Only imports from src/components/ui/ allowed (Clean Boundary)
import { AdminNav } from './AdminNav'
import { ToastProvider } from './Toast'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface AdminShellProps {
  children: React.ReactNode
  tr: ShopAdminTranslations
  ownerName: string
}

export function AdminShell({ children, tr, ownerName }: AdminShellProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <AdminNav tr={tr} ownerName={ownerName} />
      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
        {children}
      </main>
      <ToastProvider />
    </div>
  )
}
