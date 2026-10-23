'use client'

import { useState } from 'react'
import { LANGS, RTL_LANGS, type Lang } from '@/lib/lang'

type Copy = {
  title: string
  body: string
  button: string
  pending: string
  donePundo: string
  doneNaidivse: string
  neutral: string
}

const TEXTS: Record<Lang, Copy> = {
  en: { title: 'Email updates', body: 'Confirm that you no longer want this type of progression email.', button: 'Unsubscribe', pending: 'Saving…', donePundo: 'All set. Pundo will no longer send this type of progression email.', doneNaidivse: 'Done. naidivse will no longer send this type of progression email.', neutral: 'This confirmation is the same whether the link was already used or is no longer valid.' },
  de: { title: 'E-Mail-Updates', body: 'Bestätige, dass Du diese Art von Progression-E-Mail nicht mehr erhalten möchtest.', button: 'Abmelden', pending: 'Wird gespeichert…', donePundo: 'Erledigt. Pundo sendet Dir diese Art von Progression-E-Mail nicht mehr.', doneNaidivse: 'Erledigt. naidivse sendet Dir diese Art von Progression-E-Mail nicht mehr.', neutral: 'Diese Bestätigung ist gleich, unabhängig davon, ob der Link schon verwendet wurde oder nicht mehr gültig ist.' },
  el: { title: 'Ενημερώσεις email', body: 'Επιβεβαίωσε ότι δεν θέλεις πλέον να λαμβάνεις αυτό το είδος email προόδου.', button: 'Κατάργηση εγγραφής', pending: 'Αποθήκευση…', donePundo: 'Έτοιμο. Το Pundo δεν θα στέλνει πλέον αυτό το είδος email προόδου.', doneNaidivse: 'Έγινε. Το naidivse δεν θα στέλνει πλέον αυτό το είδος email προόδου.', neutral: 'Η επιβεβαίωση είναι ίδια είτε ο σύνδεσμος έχει ήδη χρησιμοποιηθεί είτε δεν είναι πλέον έγκυρος.' },
  ru: { title: 'Обновления по email', body: 'Подтвердите, что больше не хотите получать этот тип писем о прогрессе.', button: 'Отписаться', pending: 'Сохраняем…', donePundo: 'Готово. Pundo больше не будет отправлять вам этот тип писем о прогрессе.', doneNaidivse: 'Готово. naidivse больше не будет отправлять вам этот тип писем о прогрессе.', neutral: 'Подтверждение одинаково, если ссылка уже использована или больше не действительна.' },
  ar: { title: 'تحديثات البريد', body: 'أكّد أنك لم تعد ترغب في تلقي هذا النوع من رسائل التقدم.', button: 'إلغاء الاشتراك', pending: 'جارٍ الحفظ…', donePundo: 'تم. لن يرسل Pundo هذا النوع من رسائل التقدم بعد الآن.', doneNaidivse: 'تم. لن يرسل naidivse هذا النوع من رسائل التقدم بعد الآن.', neutral: 'هذه الرسالة نفسها سواء استُخدم الرابط من قبل أو لم يعد صالحًا.' },
  he: { title: 'עדכוני דוא״ל', body: 'אשרו שאינכם רוצים עוד לקבל סוג זה של הודעות התקדמות.', button: 'הסרת הרשמה', pending: 'שומר…', donePundo: 'בוצע. Pundo לא ישלח עוד סוג זה של הודעות התקדמות.', doneNaidivse: 'בוצע. naidivse לא ישלח עוד סוג זה של הודעות התקדמות.', neutral: 'האישור זהה בין אם הקישור כבר שומש ובין אם אינו תקף עוד.' },
}

function resolveLang(value: string): Lang {
  return (LANGS as readonly string[]).includes(value) ? value as Lang : 'en'
}

export function ProgressionUnsubscribeClient({ token, brand, lang }: { token: string; brand: string; lang: string }) {
  const locale = resolveLang(lang)
  const copy = TEXTS[locale]
  const isNaidivse = brand === 'naidivse'
  const [state, setState] = useState<'idle' | 'pending' | 'done'>('idle')

  async function unsubscribe() {
    setState('pending')
    try {
      await fetch(`/api/customer/customer/progression/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'GET' })
    } catch {
      // The public endpoint remains deliberately neutral: this page must not
      // distinguish an invalid link from an existing subscription.
    }
    setState('done')
  }

  const done = isNaidivse ? copy.doneNaidivse : copy.donePundo
  return (
    <main className="min-h-screen bg-bg px-4 py-16" dir={RTL_LANGS.has(locale) ? 'rtl' : 'ltr'}>
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-brand">{isNaidivse ? 'naidivse' : 'Pundo'}</p>
          <h1 className="font-heading text-2xl font-bold text-text">{copy.title}</h1>
          {state === 'idle' && <p className="text-sm leading-6 text-text-muted">{copy.body}</p>}
        </div>
        {state === 'done' ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800" data-testid="progression-unsubscribe-done">
            {done}
          </div>
        ) : (
          <button type="button" onClick={unsubscribe} disabled={state === 'pending'} className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60">
            {state === 'pending' ? copy.pending : copy.button}
          </button>
        )}
        <p className="text-xs leading-5 text-text-muted">{copy.neutral}</p>
      </section>
    </main>
  )
}
