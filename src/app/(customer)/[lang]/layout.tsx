import { notFound } from 'next/navigation'
import { LANGS } from '@/lib/lang'

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
  return <>{children}</>
}
