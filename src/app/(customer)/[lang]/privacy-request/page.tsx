import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { getBrandFromHeaders } from '@/config/brands'
import { buildStaticPageMetadata } from '@/lib/seo/static-page-metadata'
import { privacyT } from '@/lib/i18n/privacy'
import { PrivacyRequestForm } from '@/components/privacy/PrivacyRequestForm'
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> { const { lang } = await params as { lang: Lang }; const brand = await getBrandFromHeaders(); const tr = privacyT(lang); return buildStaticPageMetadata({ lang, path: '/privacy-request', title: tr.title, description: tr.title, siteName: brand.name }) }
export default async function Page({ params }: { params: Promise<{ lang: string }> }) { const { lang } = await params as { lang: Lang }; const brand = await getBrandFromHeaders(); const tr = privacyT(lang); return <main className="mx-auto max-w-2xl px-4 py-12"><h1 className="mb-6 text-2xl font-bold">{tr.title}</h1><PrivacyRequestForm lang={lang} brand={brand.slug === 'naidivse' ? 'naidivse' : 'pundo'} /></main> }
