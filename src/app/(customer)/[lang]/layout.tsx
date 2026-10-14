import { notFound } from 'next/navigation'
import { LANGS, type Lang } from '@/lib/lang'
import { LanguageHint } from '@/components/ui/LanguageHint'

interface Props {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export async function generateStaticParams() {
  return LANGS.map(lang => ({ lang }))
}

export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()
  return (
    <>
      {children}
      {/* Client-only Sprach-Hinweis (F6310) — nur auf Customer-Seiten mit /{lang}-Präfix */}
      <LanguageHint lang={lang as Lang} />
    </>
  )
}
