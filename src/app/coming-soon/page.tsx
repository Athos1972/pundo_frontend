import { getLangServer, isRTL } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getBrandFromHeaders } from '@/config/brands'
import { CountdownTimer } from './CountdownTimer'
import { EmailSignupForm } from './EmailSignupForm'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export default async function ComingSoonPage() {
  const [lang, brand] = await Promise.all([getLangServer(), getBrandFromHeaders()])
  const tr = t(lang)
  const rtl = isRTL(lang)

  return (
    <main
      className="coming-soon-bg min-h-screen relative overflow-hidden flex flex-col"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {/* Animated background blobs */}
      <div className="cs-blob cs-blob-1" />
      <div className="cs-blob cs-blob-2" />
      <div className="cs-blob cs-blob-3" />

      {/* Giant watermark */}
      <div className="cs-watermark" aria-hidden="true">НАЙДИ</div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 sm:py-24 text-center">

        {/* Language switcher */}
        <div className={`absolute top-5 ${rtl ? 'left-5' : 'right-5'}`}>
          <LanguageSwitcher current={lang} dark />
        </div>

        {/* Logo */}
        <div className="animate-entrance mb-6 sm:mb-10" style={{ animationDelay: '0ms' }}>
          <img
            src={brand.assets.logoDarkSvg ?? brand.assets.logoSvg}
            alt={brand.name}
            className="h-16 w-auto"
          />
        </div>

        {/* Headline */}
        <h1
          className="animate-entrance cs-headline mb-5"
          style={{ animationDelay: '120ms' }}
        >
          {tr.coming_soon_tagline}
        </h1>

        {/* Description */}
        <p
          className="animate-entrance cs-description mb-8 sm:mb-16"
          style={{ animationDelay: '240ms' }}
        >
          {tr.coming_soon_description}
        </p>

        {/* Countdown label */}
        <p
          className="animate-entrance cs-label mb-6"
          style={{ animationDelay: '320ms' }}
        >
          {tr.coming_soon_label}
        </p>

        {/* Countdown */}
        <div className="animate-entrance" style={{ animationDelay: '400ms' }}>
          <CountdownTimer
            labels={{
              days: tr.coming_soon_days,
              hours: tr.coming_soon_hours,
              minutes: tr.coming_soon_minutes,
              seconds: tr.coming_soon_seconds,
            }}
          />
        </div>

        {/* Divider */}
        <div
          className="animate-entrance cs-divider mt-8 sm:mt-14 mb-6 sm:mb-10"
          style={{ animationDelay: '480ms' }}
        />

        {/* Email signup */}
        <div
          className="animate-entrance w-full max-w-sm"
          style={{ animationDelay: '560ms' }}
        >
          <EmailSignupForm
            tr={{
              placeholder: tr.coming_soon_email_placeholder,
              submit: tr.coming_soon_email_submit,
              success: tr.coming_soon_email_success,
              error: tr.coming_soon_email_error,
            }}
          />
        </div>
      </div>
    </main>
  )
}
