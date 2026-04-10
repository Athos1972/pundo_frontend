// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)
import { SysAdminNav } from './AdminNav'
import { ToastProvider } from './Toast'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface SysAdminShellProps {
  children: React.ReactNode
  tr: SysAdminTranslations
  adminEmail: string
}

export function SysAdminShell({ children, tr, adminEmail }: SysAdminShellProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <SysAdminNav tr={tr} adminEmail={adminEmail} />
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
        {children}
      </main>
      <ToastProvider />
    </div>
  )
}
