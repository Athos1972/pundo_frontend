import Link from 'next/link'
import { getLangServer, RTL_LANGS } from '@/lib/lang'
import { tCommon } from '@/lib/translations'
import { localePath } from '@/lib/routing'

export default async function NotFound() {
  const lang = await getLangServer()
  const tr = tCommon(lang)
  const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4" dir={dir}>
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-text mb-2 font-heading">404</h1>
        <p className="text-text-muted mb-6">{tr.not_found_description}</p>
        <Link href={localePath(lang, '/')} className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors">
          {tr.not_found_back_home}
        </Link>
      </div>
    </div>
  )
}
