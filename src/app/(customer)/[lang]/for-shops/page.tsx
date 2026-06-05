import type { Metadata } from 'next'
import Link from 'next/link'
import { t } from '@/lib/translations'
import { forShopsContent } from '@/lib/for-shops-content'
import type { Lang } from '@/lib/lang'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { ForShopsHeroVisual } from './ForShopsHeroVisual'
import { ForShopsFaqGrid } from './ForShopsFaqGrid'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const content = forShopsContent[lang] ?? forShopsContent.en
  const pageUrl = `${siteUrl}/${lang}/for-shops`
  const title = `${tr.page_title_for_shops} — pundo`

  const { openGraph, twitter } = buildCompleteOpenGraph({
    title,
    description: content.meta_description,
    url: pageUrl,
    type: 'website',
    locale: lang,
    siteName: 'pundo',
    image: {
      url: `${siteUrl}/og/shop-fallback-default.jpg`,
      width: 1200,
      height: 630,
      alt: 'pundo — Get your business on the map',
    },
  })

  return {
    title,
    description: content.meta_description,
    alternates: {
      canonical: pageUrl,
      languages: buildHreflang(siteUrl, '/for-shops'),
    },
    openGraph,
    twitter,
  }
}

export default async function ForShopsPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const content = forShopsContent[lang] ?? forShopsContent.en

  // Language badge data for Translation USP section
  const langBadges = [
    { flag: '🇬🇧', label: 'English' },
    { flag: '🇩🇪', label: 'Deutsch' },
    { flag: '🇬🇷', label: 'Ελληνικά' },
    { flag: '🇷🇺', label: 'Русский' },
    { flag: '🇸🇦', label: 'العربية' },
    { flag: '🇮🇱', label: 'עברית' },
  ]

  // Mock product rows (decorative, not i18n'd — aria-hidden on the whole mock)
  const mockProducts = [
    { de: 'Samsung 65" QLED-Fernseher', price: '€749' },
    { de: 'Sony Noise-Cancelling Kopfhörer', price: '€279' },
  ]

  return (
    <main>
      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center gap-10 rtl:md:flex-row-reverse">

            {/* Left: text */}
            <div className="flex-1">
              {/* Eyebrow chip */}
              <div className="inline-flex items-center gap-2 bg-accent-light text-accent text-sm font-semibold px-3 py-1.5 rounded-full mb-5">
                <span
                  className="relative flex h-2 w-2"
                  aria-hidden="true"
                >
                  <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                {content.hero_eyebrow}
              </div>

              {/* H1 */}
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-text mb-4">
                {content.hero_headline}{' '}
                <span className="text-accent">{content.hero_headline_accent}</span>
              </h1>

              <p className="text-lg text-text-muted mb-6 max-w-lg">
                {content.hero_sub}
              </p>

              {/* Business type chips */}
              <div className="flex flex-wrap gap-2 mb-7">
                {content.business_type_chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-block bg-surface-alt border border-border text-text-muted text-sm px-3 py-1 rounded-full"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 mb-7">
                <Link
                  href="/shop-admin/register"
                  className="inline-block bg-accent text-surface font-semibold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors"
                >
                  {content.cta_label}
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-block border border-border text-text font-semibold px-6 py-3 rounded-xl hover:bg-surface-alt transition-colors"
                >
                  {content.cta_secondary_label}
                </a>
              </div>

              {/* Social proof */}
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text">{content.social_proof}</span>
              </p>
            </div>

            {/* Right: decorative visual — hidden on mobile */}
            <div className="flex-1 hidden md:block relative">
              <ForShopsHeroVisual className="w-full max-w-sm mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. STATS STRIP ──────────────────────────────────────── */}
      <section className="bg-text">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center mb-4">
            {[
              { value: content.stats.businesses, label: 'businesses' },
              { value: content.stats.searches, label: 'searches/month' },
              { value: content.stats.cities, label: 'cities' },
              { value: '€0*', label: 'monthly fee' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl sm:text-4xl font-bold text-accent font-display">{value}</div>
                <div className="text-sm text-surface/60 mt-1">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-surface/40 text-center mt-2 max-w-xl mx-auto">
            * {content.stats.fee_note}
          </p>
        </div>
      </section>

      {/* ── 3. PAIN / GAIN ──────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-surface-alt">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text text-center mb-10">
            {content.pain_gain_title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rtl:sm:flex-row-reverse">
            {/* Without pundo */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-semibold text-text-muted mb-4 text-sm uppercase tracking-wide">Without pundo</h3>
              <ul className="space-y-3">
                {content.pain_items.map((item) => (
                  <li key={item} className="flex items-start gap-2 rtl:flex-row-reverse">
                    <span className="text-text-light font-bold mt-0.5 flex-shrink-0" aria-hidden="true">✕</span>
                    <span className="text-text-light line-through leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* With pundo */}
            <div className="bg-surface border border-accent/30 rounded-2xl p-6">
              <h3 className="font-semibold text-accent mb-4 text-sm uppercase tracking-wide">With pundo</h3>
              <ul className="space-y-3">
                {content.gain_items.map((item) => (
                  <li key={item} className="flex items-start gap-2 rtl:flex-row-reverse">
                    <span className="text-accent font-bold mt-0.5 flex-shrink-0" aria-hidden="true">→</span>
                    <span className="text-text font-medium leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. FEATURE CARDS ────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text text-center mb-10">
            {content.features_title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {content.features.map((f) => (
              <div
                key={f.title}
                className="group relative bg-surface border border-border rounded-2xl p-5 transition hover:-translate-y-[3px] hover:shadow-lg overflow-hidden"
              >
                {/* Top border reveal on hover — static fallback: border-t-2 transparent → accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

                <div
                  className="inline-flex items-center justify-center w-10 h-10 bg-accent-light rounded-xl text-xl mb-3"
                  aria-hidden="true"
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold text-text mb-1">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. TRANSLATION USP ──────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-surface-alt">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-surface border border-border rounded-[20px] p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row gap-10 rtl:sm:flex-row-reverse">

              {/* Left: text */}
              <div className="flex-1">
                <span className="inline-block text-xs font-semibold text-accent uppercase tracking-widest mb-3">
                  {content.translation_usp.eyebrow}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-text mb-4">
                  {content.translation_usp.headline}{' '}
                  <span className="text-accent">{content.translation_usp.headline_accent}</span>
                </h2>
                <p className="text-text-muted leading-relaxed mb-6">
                  {content.translation_usp.body}
                </p>
                {/* Language badges */}
                <div className="flex flex-wrap gap-2">
                  {langBadges.map(({ flag, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 bg-bg border border-border text-sm px-2.5 py-1 rounded-md text-text"
                    >
                      <span aria-hidden="true">{flag}</span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: translation mock — hidden on very small screens */}
              <div
                className="flex-shrink-0 hidden sm:block w-64"
                aria-hidden="true"
              >
                <div className="bg-surface-alt border border-border rounded-xl overflow-hidden text-sm">
                  {/* Language tabs */}
                  <div className="flex gap-1 p-2 border-b border-border">
                    {['DE', 'EN', 'EL', 'RU', 'AR', 'HE'].map((code) => (
                      <span
                        key={code}
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          code === 'DE'
                            ? 'bg-accent text-surface'
                            : 'text-text-muted'
                        }`}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                  {/* Mock product rows */}
                  <div className="divide-y divide-border">
                    {mockProducts.map((p) => (
                      <div key={p.de} className="flex items-center justify-between px-3 py-2.5">
                        <span className="text-text text-xs">{p.de}</span>
                        <span className="text-accent font-bold text-xs">{p.price}</span>
                      </div>
                    ))}
                  </div>
                  {/* Footnote */}
                  <div className="px-3 py-2 bg-accent-light text-accent text-[10px] leading-snug">
                    {content.translation_usp.mock_label}
                  </div>
                  <div className="px-3 py-1.5 text-text-muted text-[10px]">
                    {content.translation_usp.mock_footnote}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── 6. HOW IT WORKS — dark band ─────────────────────────── */}
      <section id="how-it-works" className="py-6 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-text rounded-[20px] px-6 sm:px-10 py-12 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-bg text-center mb-2">
              {content.steps_title}
            </h2>
            <p className="text-center text-surface/55 mb-10 text-sm">
              From registration to live in under 10 minutes.
            </p>

            {/* Steps */}
            <div className="relative flex flex-col sm:flex-row gap-8 sm:gap-0">
              {/* Connector line — desktop only */}
              <div
                className="hidden sm:block absolute top-5 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-[rgba(212,98,42,0.3)]"
                aria-hidden="true"
              />

              {content.steps.map((step) => (
                <div key={step.num} className="flex-1 flex flex-col items-center text-center px-4 relative z-10">
                  {/* Step circle */}
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-surface font-bold text-sm mb-3 font-display flex-shrink-0">
                    {step.num}
                  </div>
                  {/* Time pill */}
                  <span className="inline-block bg-surface/10 text-surface/70 text-xs font-medium px-3 py-0.5 rounded-full mb-2">
                    {step.time}
                  </span>
                  <h3 className="font-semibold text-bg mb-1">{step.title}</h3>
                  <p className="text-sm text-surface/60 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text text-center mb-10">
            {content.testimonials_title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {content.testimonials.map((t) => (
              <div key={t.name} className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
                {/* Stars — decorative colour #D4911A, see §4 of architecture */}
                <div className="text-[#D4911A] mb-3 text-lg" aria-label="5 stars" role="img">
                  ★★★★★
                </div>
                <p className="text-text-muted italic text-sm leading-relaxed mb-5 flex-1">
                  <span className="text-accent font-bold text-xl not-italic mr-0.5">«</span>
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-surface flex-shrink-0 ${
                      t.color ?? 'bg-accent'
                    }`}
                    aria-hidden="true"
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-text text-sm">{t.name}</div>
                    <div className="text-text-muted text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ──────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-surface-alt">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text text-center mb-10">
            {content.faq_title}
          </h2>
          <ForShopsFaqGrid items={content.faq} />
        </div>
      </section>

      {/* ── 9. FINAL CTA ────────────────────────────────────────── */}
      <section className="py-6 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div
            className="relative bg-text rounded-[20px] px-6 sm:px-16 py-14 sm:py-20 text-center overflow-hidden"
          >
            {/* Radial gradient overlays — decorative */}
            <div
              className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none"
              // @csp-allow-inline-style — radial-gradient with CSS var, not expressible as Tailwind
              style={{ background: 'radial-gradient(circle at top right, var(--color-accent), transparent 70%)' }}
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 left-0 w-64 h-64 opacity-10 pointer-events-none"
              // @csp-allow-inline-style — radial-gradient with CSS var, not expressible as Tailwind
              style={{ background: 'radial-gradient(circle at bottom left, var(--color-accent), transparent 70%)' }}
              aria-hidden="true"
            />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-bg mb-4">
                {content.final_cta_title}
              </h2>
              <p className="text-surface/65 mb-8 max-w-lg mx-auto">
                {content.final_cta_body}
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-5">
                <Link
                  href="/shop-admin/register"
                  className="inline-block bg-accent text-surface font-semibold px-8 py-3 rounded-xl hover:bg-accent-dark transition-colors"
                >
                  {content.final_cta_primary}
                </Link>
                <Link
                  href="/contact"
                  className="inline-block border border-surface/30 text-surface font-semibold px-8 py-3 rounded-xl hover:bg-surface/10 transition-colors"
                >
                  {content.final_cta_secondary}
                </Link>
              </div>
              <p className="text-surface/40 text-sm">{content.final_cta_fineprint}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Help link */}
      <p className="text-center text-sm text-text-muted mb-10">
        <Link href="/help" className="underline hover:text-text transition-colors">
          {tr.footer_help}
        </Link>
        {' · '}
        <Link href="/contact" className="underline hover:text-text transition-colors">
          {tr.footer_contact}
        </Link>
      </p>
    </main>
  )
}
