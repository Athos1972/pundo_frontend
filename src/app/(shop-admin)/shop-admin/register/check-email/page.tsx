import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'

export default async function CheckEmailPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col gap-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-3xl">
            ✉️
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr.check_email_title}</h1>
          <p className="text-sm text-gray-500 mt-2">{tr.check_email_desc}</p>
        </div>

        <p className="text-xs text-gray-400">{tr.check_email_hint}</p>

        <Link
          href="/shop-admin/login"
          className="text-sm text-accent hover:underline font-medium"
        >
          {tr.login_btn}
        </Link>
      </div>
    </div>
  )
}
