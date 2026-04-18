import { getLangServer, isRTL } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getBrandFromHeaders } from '@/config/brands'
import { CountdownTimer } from './CountdownTimer'
import { EmailSignupForm } from './EmailSignupForm'

export default async function ComingSoonPage() {
  const [lang, brand] = await Promise.all([getLangServer(), getBrandFromHeaders()])
  const tr = t(lang)
  const rtl = isRTL(lang)

  return (
    <main
      className="coming-soon-bg min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {/* Logo */}
      <div className="animate-entrance mb-10" style={{ animationDelay: '0ms' }}>
        <img
          src={brand.assets.logoSvg}
          alt={brand.name}
          className="h-12 w-auto brightness-0 invert"
        />
      </div>

      {/* Tagline */}
      <h1
        className="animate-entrance text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
        style={{ animationDelay: '100ms' }}
      >
        {tr.coming_soon_tagline}
      </h1>

      {/* Description */}
      <p
        className="animate-entrance text-white/70 text-base max-w-sm mb-12 leading-relaxed"
        style={{ animationDelay: '200ms' }}
      >
        {tr.coming_soon_description}
      </p>

      {/* Countdown label */}
      <p
        className="animate-entrance text-xs uppercase tracking-widest text-white/50 mb-4"
        style={{ animationDelay: '300ms' }}
      >
        {tr.coming_soon_label}
      </p>

      {/* Countdown */}
      <div className="animate-entrance" style={{ animationDelay: '350ms' }}>
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
        className="animate-entrance w-16 h-px bg-white/20 mt-12 mb-10"
        style={{ animationDelay: '450ms' }}
      />

      {/* Email signup */}
      <div
        className="animate-entrance w-full max-w-xs"
        style={{ animationDelay: '500ms' }}
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
    </main>
  )
}
