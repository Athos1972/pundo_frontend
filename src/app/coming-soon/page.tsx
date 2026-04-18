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
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {/* Logo */}
      <img
        src={brand.assets.logoSvg}
        alt={brand.name}
        className="h-12 w-auto mb-10"
      />

      {/* Tagline */}
      <h1 className="text-3xl sm:text-4xl font-bold text-accent mb-4 leading-tight">
        {tr.coming_soon_tagline}
      </h1>

      {/* Description */}
      <p className="text-text-muted text-base max-w-sm mb-12 leading-relaxed">
        {tr.coming_soon_description}
      </p>

      {/* Countdown label */}
      <p className="text-xs uppercase tracking-widest text-text-muted mb-4">
        {tr.coming_soon_label}
      </p>

      {/* Countdown */}
      <CountdownTimer
        labels={{
          days: tr.coming_soon_days,
          hours: tr.coming_soon_hours,
          minutes: tr.coming_soon_minutes,
          seconds: tr.coming_soon_seconds,
        }}
      />

      {/* Divider */}
      <div className="w-16 h-px bg-border mt-12 mb-10" />

      {/* Email signup */}
      <div className="w-full max-w-xs">
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
