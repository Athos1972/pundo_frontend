import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'

export default async function PendingApprovalPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center flex flex-col gap-4">
        <div className="text-4xl" aria-hidden="true">⏳</div>
        <h1 className="text-xl font-bold text-gray-900">{tr.pending_title}</h1>
        <p className="text-sm text-gray-500">{tr.pending_desc}</p>
      </div>
    </div>
  )
}
