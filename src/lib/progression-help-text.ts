import type { Lang } from '@/lib/lang'

export interface ProgressionHelpText {
  open: string; close: string; title: string; what: string; earn: string; costs: string; free: string
  disabled: string; enabled: string; more: string; helpDetails: string
  actions: Record<string, string>
}

export const progressionHelpText: Record<Lang, ProgressionHelpText> = {
  en: { open: 'What are Credits and Levels?', close: 'Close Credits and Levels help', title: 'Credits and Levels', what: 'Credits can pay for extra features. Your level shows your confirmed community contributions.', earn: 'Earn', costs: 'Costs', free: 'Free allowance', disabled: 'The current action is within its free allowance.', enabled: 'After the free allowance, the shown credit price applies.', more: 'Read more in Help', helpDetails: 'Confirmed community actions can earn rank and currency. Before an action that can cost currency, its current price and free allowance are shown; the action itself confirms the applicable rule.', actions: { vote_language: 'Language vote', vote_label: 'Label vote', spotted_report: 'Report an item', photo_upload: 'Photo approved', review_approved: 'Review approved' } },
  de: { open: 'Was sind Credits und Level?', close: 'Hilfe zu Credits und Level schließen', title: 'Credits und Level', what: 'Credits können zusätzliche Funktionen bezahlen. Dein Level zeigt deine bestätigten Beiträge zur Community.', earn: 'Verdienen', costs: 'Kosten', free: 'Gratis-Kontingent', disabled: 'Für diese Aktion gilt aktuell das Gratis-Kontingent.', enabled: 'Nach dem Gratis-Kontingent gilt der angezeigte Credit-Preis.', more: 'Mehr in der Hilfe lesen', helpDetails: 'Bestätigte Beiträge zur Community können Rang und Währung einbringen. Vor einer möglicherweise kostenpflichtigen Aktion werden aktueller Preis und Gratis-Kontingent angezeigt; die Aktion selbst bestätigt die geltende Regel.', actions: { vote_language: 'Sprach-Vote', vote_label: 'Label-Vote', spotted_report: 'Produkt melden', photo_upload: 'Foto freigegeben', review_approved: 'Bewertung freigegeben' } },
  el: { open: 'Τι είναι οι μονάδες και τα επίπεδα;', close: 'Κλείσιμο βοήθειας μονάδων και επιπέδων', title: 'Μονάδες και επίπεδα', what: 'Οι μονάδες πληρώνουν επιπλέον λειτουργίες. Το επίπεδό σας δείχνει τις επιβεβαιωμένες συνεισφορές σας.', earn: 'Κερδίζετε', costs: 'Κόστος', free: 'Δωρεάν όριο', disabled: 'Η τρέχουσα ενέργεια καλύπτεται από το δωρεάν όριο.', enabled: 'Μετά το δωρεάν όριο ισχύει η εμφανιζόμενη τιμή μονάδων.', more: 'Περισσότερα στη βοήθεια', helpDetails: 'Οι επιβεβαιωμένες συνεισφορές μπορούν να κερδίζουν βαθμό και νόμισμα. Πριν από μια ενέργεια με πιθανό κόστος, εμφανίζονται η τρέχουσα τιμή και το δωρεάν όριο.', actions: { vote_language: 'Ψήφος γλώσσας', vote_label: 'Ψήφος ετικέτας', spotted_report: 'Αναφορά προϊόντος', photo_upload: 'Έγκριση φωτογραφίας', review_approved: 'Έγκριση αξιολόγησης' } },
  ru: { open: 'Что такое кредиты и уровни?', close: 'Закрыть справку о кредитах и уровнях', title: 'Кредиты и уровни', what: 'Кредиты оплачивают дополнительные функции. Уровень показывает подтверждённый вклад в сообщество.', earn: 'Как получить', costs: 'Стоимость', free: 'Бесплатный лимит', disabled: 'Для этого действия действует бесплатный лимит.', enabled: 'После бесплатного лимита применяется указанная цена в кредитах.', more: 'Подробнее в справке', helpDetails: 'Подтверждённые действия в сообществе могут приносить ранг и валюту. Перед действием с возможной оплатой показываются текущая цена и бесплатный лимит.', actions: { vote_language: 'Голос за язык', vote_label: 'Голос за метку', spotted_report: 'Сообщение о товаре', photo_upload: 'Одобренное фото', review_approved: 'Одобренный отзыв' } },
  ar: { open: 'ما هي الأرصدة والمستويات؟', close: 'إغلاق مساعدة الأرصدة والمستويات', title: 'الأرصدة والمستويات', what: 'تدفع الأرصدة ميزات إضافية. يوضح مستواك مساهماتك المؤكدة في المجتمع.', earn: 'كيف تكسب', costs: 'التكلفة', free: 'الحصة المجانية', disabled: 'ينطبق على هذا الإجراء حدّ مجاني.', enabled: 'بعد الحصة المجانية ينطبق سعر الأرصدة المعروض.', more: 'اقرأ المزيد في المساعدة', helpDetails: 'يمكن للمساهمات المؤكدة في المجتمع أن تكسب رتبة وعملة. قبل الإجراء الذي قد يكلّف عملة تظهر التكلفة الحالية والحصة المجانية.', actions: { vote_language: 'تصويت اللغة', vote_label: 'تصويت التسمية', spotted_report: 'الإبلاغ عن منتج', photo_upload: 'صورة معتمدة', review_approved: 'مراجعة معتمدة' } },
  he: { open: 'מהם קרדיטים ורמות?', close: 'סגירת עזרת קרדיטים ורמות', title: 'קרדיטים ורמות', what: 'קרדיטים משלמים על תכונות נוספות. הרמה שלך מציגה את התרומות המאושרות שלך לקהילה.', earn: 'איך מרוויחים', costs: 'עלות', free: 'מכסה חינמית', disabled: 'לפעולה זו חלה מכסה חינמית.', enabled: 'לאחר המכסה החינמית חל מחיר הקרדיטים המוצג.', more: 'קראו עוד בעזרה', helpDetails: 'תרומות מאושרות לקהילה יכולות להעניק דירוג ומטבע. לפני פעולה שעשויה לעלות מטבע מוצגים המחיר הנוכחי והמכסה החינמית.', actions: { vote_language: 'הצבעת שפה', vote_label: 'הצבעת תווית', spotted_report: 'דיווח על פריט', photo_upload: 'תמונה שאושרה', review_approved: 'ביקורת שאושרה' } },
}

export interface ProgressionHelpDetailText {
  loading: string; unavailable: string; legacy: string; what?: string; disabled?: string; enabled?: string; more?: string
  earnings: (action: string, xp: number, credits: number, rank: string, currency: string) => string
  prices: (homesick: number, mcp: number, block: number, productMail: number, currency: string) => string
  allowance: (daily: number, monthly: number, mcpDaily: number, productMonthly: number) => string
  names: { rank: string; currency: string }
}

export const progressionHelpDetails: Record<Lang, Record<'pundo' | 'naidivse', ProgressionHelpDetailText>> = {
  en: {
    pundo: { loading: 'Loading the current rules…', unavailable: 'The current rules are unavailable. Please try again later.', legacy: 'The figures in this older account card are not yet the new Island Rank or Carobs values.', earnings: (a, x, c, r, w) => `${a}: ${x} ${r} points and ${c} ${w}`, prices: (h, m, b, p, w) => `Homesick search: ${h} ${w}; MCP: ${m} ${w} for each block of ${b} calls; product-mail subscription: ${p} ${w}.`, allowance: (d, m, mc, pm) => `Homesick is free for ${d} searches each day and ${m} each month. MCP has ${mc} free calls each day. ${pm} product-mail subscriptions are free each month.`, names: { rank: 'Island Rank', currency: 'Carobs (Cyprus carob pods)' } },
    naidivse: { loading: 'Loading current rules…', unavailable: 'Rules are unavailable. Try again shortly.', legacy: 'This older account card does not yet show your new Instinct or Coins.', earnings: (a, x, c, r, w) => `${a}: ${x} ${r} points and ${c} ${w}`, prices: (h, m, b, p, w) => `Homesick: ${h} ${w}; MCP: ${m} ${w} per ${b}-call block; product mail: ${p} ${w}.`, allowance: (d, m, mc, pm) => `${d} free Homesick searches per day, ${m} per month; ${mc} free MCP calls per day; ${pm} free product-mail subscriptions per month.`, names: { rank: 'Instinct', currency: 'Coins' } },
  },
  de: { pundo: { loading: 'Aktuelle Regeln werden geladen…', unavailable: 'Die aktuellen Regeln sind nicht verfügbar. Bitte später erneut versuchen.', legacy: 'Die Werte dieser älteren Konto-Karte sind noch nicht der neue Inselrang oder Carobs.', earnings: (a,x,c,r,w) => `${a}: ${x} ${r}-Punkte und ${c} ${w}`, prices: (h,m,b,p,w) => `Homesick-Suche: ${h} ${w}; MCP: ${m} ${w} je Block mit ${b} Aufrufen; Produkt-Mail-Abo: ${p} ${w}.`, allowance: (d,m,mc,pm) => `Homesick ist für ${d} Suchen pro Tag und ${m} pro Monat gratis. MCP hat ${mc} Gratis-Aufrufe pro Tag. ${pm} Produkt-Mail-Abos sind pro Monat gratis.`, names: { rank: 'Inselrang', currency: 'Carobs (Johannisbrot)' } }, naidivse: { loading: 'Aktuelle Regeln werden geladen…', unavailable: 'Regeln nicht verfügbar. Bitte gleich erneut versuchen.', legacy: 'Diese ältere Konto-Karte zeigt dein neues Gespür oder deine Münzen noch nicht.', earnings: (a,x,c,r,w) => `${a}: ${x} ${r}-Punkte und ${c} ${w}`, prices: (h,m,b,p,w) => `Homesick: ${h} ${w}; MCP: ${m} ${w} je ${b} Aufrufe; Produkt-Mail: ${p} ${w}.`, allowance: (d,m,mc,pm) => `${d} kostenlose Homesick-Suchen pro Tag, ${m} pro Monat; ${mc} kostenlose MCP-Aufrufe pro Tag; ${pm} kostenlose Produkt-Mail-Abos pro Monat.`, names: { rank: 'Gespür', currency: 'Münzen' } } },
  ru: { pundo: { loading: 'Загружаем текущие правила…', unavailable: 'Текущие правила недоступны. Повторите позже.', legacy: 'Эта старая карточка аккаунта ещё не показывает новый Островной ранг или каробы.', earnings: (a,x,c,r,w) => `${a}: ${x} очков ${r} и ${c} ${w}`, prices: (h,m,b,p,w) => `Поиск похожего: ${h} ${w}; инструмент агента: ${m} ${w} за блок из ${b} вызовов; товарные уведомления: ${p} ${w}.`, allowance: (d,m,mc,pm) => `Поиск похожего бесплатен: ${d} поисков в день и ${m} в месяц. Инструмент агента: ${mc} бесплатных вызовов в день. Товарные уведомления: ${pm} бесплатных подписок в месяц.`, names: { rank: 'Островной ранг', currency: 'каробов (рожковое дерево)' } }, naidivse: { loading: 'Загружаем правила…', unavailable: 'Правила недоступны. Попробуйте позже.', legacy: 'Эта старая карточка ещё не показывает новое Чутьё или Монеты.', earnings: (a,x,c,r,w) => `${a}: ${x} очков ${r} и ${c} ${w}`, prices: (h,m,b,p,w) => `Поиск похожего: ${h} ${w}; инструмент агента: ${m} ${w} за ${b} вызовов; товарные уведомления: ${p} ${w}.`, allowance: (d,m,mc,pm) => `${d} бесплатных поисков похожего в день, ${m} в месяц; ${mc} бесплатных вызовов инструмента агента в день; ${pm} бесплатных товарных уведомлений в месяц.`, names: { rank: 'Чутьё', currency: 'Монеты' } } },
  el: { pundo: { loading: 'Φόρτωση των τρεχόντων κανόνων…', unavailable: 'Οι τρέχοντες κανόνες δεν είναι διαθέσιμοι. Δοκιμάστε αργότερα.', legacy: 'Η παλαιότερη κάρτα λογαριασμού δεν δείχνει ακόμη τον νέο Νησιωτικό βαθμό ή τα χαρούπια.', earnings: (a,x,c,r,w) => `${a}: ${x} πόντοι ${r} και ${c} ${w}`, prices: (h,m,b,p,w) => `Homesick: ${h} ${w}; MCP: ${m} ${w} ανά μπλοκ ${b} κλήσεων; Product Mail: ${p} ${w}.`, allowance: (d,m,mc,pm) => `Homesick δωρεάν για ${d} αναζητήσεις την ημέρα και ${m} τον μήνα. MCP: ${mc} δωρεάν κλήσεις την ημέρα. Product Mail: ${pm} δωρεάν συνδρομές τον μήνα.`, names: { rank: 'Νησιωτικός βαθμός', currency: 'χαρούπια' } }, naidivse: { loading: 'Φόρτωση κανόνων…', unavailable: 'Οι κανόνες δεν είναι διαθέσιμοι. Δοκιμάστε ξανά.', legacy: 'Η παλιά κάρτα δεν δείχνει ακόμη το νέο Ένστικτο ή τα Νομίσματα.', earnings: (a,x,c,r,w) => `${a}: ${x} πόντοι ${r} και ${c} ${w}`, prices: (h,m,b,p,w) => `Homesick: ${h} ${w}; MCP: ${m} ${w} ανά ${b} κλήσεις; Product Mail: ${p} ${w}.`, allowance: (d,m,mc,pm) => `${d} δωρεάν Homesick την ημέρα, ${m} τον μήνα; ${mc} MCP την ημέρα; ${pm} Product Mail τον μήνα.`, names: { rank: 'Ένστικτο', currency: 'Νομίσματα' } } },
  ar: { pundo: { loading: 'جارٍ تحميل القواعد الحالية…', unavailable: 'القواعد الحالية غير متاحة. حاول لاحقاً.', legacy: 'بطاقة الحساب القديمة هذه لا تعرض بعد رتبة الجزيرة الجديدة أو قرون الخروب.', earnings: (a,x,c,r,w) => `${a}: ${x} نقاط ${r} و${c} ${w}`, prices: (h,m,b,p,w) => `بحث مشابه: ${h} ${w}؛ أداة الوكيل: ${m} ${w} لكل كتلة من ${b} استدعاء؛ تنبيهات المنتجات: ${p} ${w}.`, allowance: (d,m,mc,pm) => `البحث المشابه مجاني لـ${d} بحث يومياً و${m} شهرياً. أداة الوكيل: ${mc} استدعاء مجانياً يومياً. تنبيهات المنتجات: ${pm} اشتراكاً مجانياً شهرياً.`, names: { rank: 'رتبة الجزيرة', currency: 'قرون الخروب' } }, naidivse: { loading: 'جارٍ تحميل القواعد…', unavailable: 'القواعد غير متاحة. حاول لاحقاً.', legacy: 'بطاقة الحساب القديمة لا تعرض بعد الحدس الجديد أو العملات.', earnings: (a,x,c,r,w) => `${a}: ${x} نقاط ${r} و${c} ${w}`, prices: (h,m,b,p,w) => `بحث مشابه: ${h} ${w}؛ أداة الوكيل: ${m} ${w} لكل ${b} استدعاء؛ تنبيهات المنتجات: ${p} ${w}.`, allowance: (d,m,mc,pm) => `${d} بحثاً مشابهاً مجانياً يومياً، ${m} شهرياً؛ ${mc} استدعاءً مجانياً لأداة الوكيل يومياً؛ ${pm} تنبيهاً للمنتجات مجانياً شهرياً.`, names: { rank: 'الحدس', currency: 'العملات' } } },
  he: { pundo: { loading: 'טוענים את הכללים העדכניים…', unavailable: 'הכללים העדכניים אינם זמינים. נסו שוב מאוחר יותר.', legacy: 'כרטיס החשבון הישן הזה עדיין אינו מציג את דירוג האי החדש או את חרובי הקארוב.', earnings: (a,x,c,r,w) => `${a}: ${x} נקודות ${r} ו־${c} ${w}`, prices: (h,m,b,p,w) => `חיפוש דומה: ${h} ${w}; כלי סוכן: ${m} ${w} לכל בלוק של ${b} קריאות; התראות מוצר: ${p} ${w}.`, allowance: (d,m,mc,pm) => `חיפוש דומה חינם עבור ${d} חיפושים ביום ו־${m} בחודש. כלי סוכן: ${mc} קריאות חינם ביום. התראות מוצר: ${pm} מנויים חינם בחודש.`, names: { rank: 'דירוג האי', currency: 'חרובי קארוב' } }, naidivse: { loading: 'טוענים כללים…', unavailable: 'הכללים אינם זמינים. נסו שוב מאוחר יותר.', legacy: 'כרטיס החשבון הישן עדיין אינו מציג את האינסטינקט או המטבעות החדשים.', earnings: (a,x,c,r,w) => `${a}: ${x} נקודות ${r} ו־${c} ${w}`, prices: (h,m,b,p,w) => `חיפוש דומה: ${h} ${w}; כלי סוכן: ${m} ${w} לכל ${b} קריאות; התראות מוצר: ${p} ${w}.`, allowance: (d,m,mc,pm) => `${d} חיפושים דומים חינם ביום, ${m} בחודש; ${mc} קריאות חינם של כלי סוכן ביום; ${pm} התראות מוצר חינם בחודש.`, names: { rank: 'אינסטינקט', currency: 'מטבעות' } } },
}

type ProgressionBrand = 'pundo' | 'naidivse'

function plural(lang: Lang, amount: number): Intl.LDMLPluralRule {
  return new Intl.PluralRules(lang).select(amount)
}

/** Customer-visible earned-value grammar.  It lives with the translations so
 * components never embed a foreign word or a plural rule. */
export function progressionEarningText(
  lang: Lang, brand: ProgressionBrand, action: string, rankAmount: number, currencyAmount: number,
): string {
  const rank = progressionHelpDetails[lang][brand].names.rank
  const currency = progressionHelpDetails[lang][brand].names.currency.replace(/\s*\(.+\)$/, '')
  const rp = plural(lang, rankAmount)
  const cp = plural(lang, currencyAmount)
  if (lang === 'en') return `${action}: ${rankAmount} ${rank} ${rp === 'one' ? 'point' : 'points'} and ${currencyAmount} ${cp === 'one' ? currency.replace(/s$/, '') : currency}`
  if (lang === 'de') return `${action}: ${rankAmount} ${rp === 'one' ? `${rank}-Punkt` : `${rank}-Punkte`} und ${currencyAmount} ${cp === 'one' ? currency.replace(/s$/, '') : currency}`
  if (lang === 'ru') {
    const r = rp === 'one' ? 'очко' : rp === 'few' ? 'очка' : 'очков'
    const c = brand === 'naidivse'
      ? (cp === 'one' ? 'Монета' : cp === 'few' ? 'Монеты' : 'Монет')
      : (cp === 'one' ? 'кароб' : cp === 'few' ? 'кароба' : 'каробов')
    return `${action}: ${rankAmount} ${r} ${rank} и ${currencyAmount} ${c}`
  }
  if (lang === 'he') {
    const c = brand === 'naidivse' ? (cp === 'one' ? 'מטבע' : 'מטבעות') : (cp === 'one' ? 'חרוב' : 'חרובים')
    return `${action}: ${rankAmount} ${rp === 'one' ? 'נקודת' : 'נקודות'} ${rank} ו־${currencyAmount} ${c}`
  }
  if (lang === 'ar') {
    const c = brand === 'naidivse' ? (cp === 'one' ? 'عملة' : cp === 'two' ? 'عملتان' : 'عملات') : (cp === 'one' ? 'قرن الخروب' : cp === 'two' ? 'قرنا الخروب' : 'قرون الخروب')
    return `${action}: ${rankAmount} ${rp === 'one' ? 'نقطة' : rp === 'two' ? 'نقطتان' : 'نقاط'} ${rank} و${currencyAmount} ${c}`
  }
  return `${action}: ${rankAmount} ${rp === 'one' ? 'πόντος' : 'πόντοι'} ${rank} και ${currencyAmount} ${cp === 'one' ? currency.replace(/ια$/, 'ι') : currency}`
}

export function progressionIntroduction(lang: Lang, brand: ProgressionBrand): string {
  const { rank, currency } = progressionHelpDetails[lang][brand].names
  const shortCurrency = currency.replace(/\s*\(.+\)$/, '')
  const text: Record<Lang, [string, string]> = {
    en: [`${rank} grows with confirmed community contributions.`, `${shortCurrency} are earned there and can pay for actions.`],
    de: [`Der ${rank} wächst mit bestätigten Beiträgen zur Community.`, `${shortCurrency} werden dabei verdient und bezahlen Aktionen.`],
    el: [`Ο ${rank} αυξάνεται με επιβεβαιωμένες συνεισφορές.`, `Τα ${shortCurrency} κερδίζονται έτσι και πληρώνουν ενέργειες.`],
    ru: [`${rank} растёт за подтверждённые действия в сообществе.`, `${shortCurrency} зарабатываются так и оплачивают действия.`],
    ar: [`تزداد ${rank} بالمساهمات المؤكدة في المجتمع.`, `تُكتسب ${shortCurrency} بذلك وتدفع مقابل الإجراءات.`],
    he: [`${rank} עולה בזכות תרומות מאושרות לקהילה.`, `${shortCurrency} נצברים כך ומשלמים על פעולות.`],
  }
  return text[lang].join(' ')
}

function currencyWord(lang: Lang, brand: ProgressionBrand, amount: number): string {
  const category = plural(lang, amount)
  if (lang === 'en') return brand === 'pundo' ? (category === 'one' ? 'Carob' : 'Carobs') : (category === 'one' ? 'Coin' : 'Coins')
  if (lang === 'de') return brand === 'pundo' ? (category === 'one' ? 'Carob' : 'Carobs') : (category === 'one' ? 'Münze' : 'Münzen')
  if (lang === 'ru') return brand === 'pundo' ? (category === 'one' ? 'кароб' : category === 'few' ? 'кароба' : 'каробов') : (category === 'one' ? 'Монета' : category === 'few' ? 'Монеты' : 'Монет')
  if (lang === 'he') return brand === 'pundo' ? (category === 'one' ? 'חרוב' : 'חרובים') : (category === 'one' ? 'מטבע' : 'מטבעות')
  if (lang === 'ar') return brand === 'pundo' ? (category === 'one' ? 'قرن الخروب' : category === 'two' ? 'قرنا الخروب' : 'قرون الخروب') : (category === 'one' ? 'عملة' : category === 'two' ? 'عملتان' : 'عملات')
  return category === 'one' ? 'χαρούπι' : 'χαρούπια'
}

function unitWord(lang: Lang, unit: 'search' | 'call' | 'subscription', amount: number): string {
  const category = plural(lang, amount)
  const words: Record<Lang, Record<typeof unit, Record<string, string>>> = {
    en: { search: { one: 'search', other: 'searches' }, call: { one: 'call', other: 'calls' }, subscription: { one: 'subscription', other: 'subscriptions' } },
    de: { search: { one: 'Suche', other: 'Suchen' }, call: { one: 'Aufruf', other: 'Aufrufe' }, subscription: { one: 'Abo', other: 'Abos' } },
    el: { search: { one: 'αναζήτηση', other: 'αναζητήσεις' }, call: { one: 'κλήση', other: 'κλήσεις' }, subscription: { one: 'συνδρομή', other: 'συνδρομές' } },
    ru: { search: { one: 'поиск', few: 'поиска', many: 'поисков', other: 'поисков' }, call: { one: 'вызов', few: 'вызова', many: 'вызовов', other: 'вызовов' }, subscription: { one: 'подписка', few: 'подписки', many: 'подписок', other: 'подписок' } },
    ar: { search: { one: 'بحث', two: 'بحثان', few: 'عمليات بحث', many: 'عملية بحث', other: 'عملية بحث' }, call: { one: 'استدعاء', two: 'استدعاءان', few: 'استدعاءات', many: 'استدعاء', other: 'استدعاء' }, subscription: { one: 'اشتراك', two: 'اشتراكان', few: 'اشتراكات', many: 'اشتراك', other: 'اشتراك' } },
    he: { search: { one: 'חיפוש', other: 'חיפושים' }, call: { one: 'קריאה', other: 'קריאות' }, subscription: { one: 'מנוי', other: 'מנויים' } },
  }
  return words[lang][unit][category] ?? words[lang][unit].other
}

export function progressionPriceText(lang: Lang, brand: ProgressionBrand, homesick: number, mcp: number, block: number, productMail: number): string {
  const h = `${homesick} ${currencyWord(lang, brand, homesick)}`
  const m = `${mcp} ${currencyWord(lang, brand, mcp)}`
  const p = `${productMail} ${currencyWord(lang, brand, productMail)}`
  if (lang === 'en') return `Homesick search: ${h}; MCP: ${m} for each block of ${block} ${unitWord(lang, 'call', block)}; product-mail subscription: ${p}.`
  if (lang === 'de') return `Homesick-Suche: ${h}; MCP: ${m} je Block mit ${block} ${unitWord(lang, 'call', block)}; Produkt-Mail-Abo: ${p}.`
  if (lang === 'ru') return `Поиск похожего: ${h}; инструмент агента: ${m} за блок из ${block} ${unitWord(lang, 'call', block)}; товарные уведомления: ${p}.`
  if (lang === 'ar') return `بحث مشابه: ${h}؛ أداة الوكيل: ${m} لكل كتلة من ${block} ${unitWord(lang, 'call', block)}؛ تنبيهات المنتجات: ${p}.`
  if (lang === 'he') return `חיפוש דומה: ${h}; כלי סוכן: ${m} לכל בלוק של ${block} ${unitWord(lang, 'call', block)}; התראות מוצר: ${p}.`
  return `Αναζήτηση: ${h}; εργαλείο πράκτορα: ${m} ανά μπλοκ ${block} ${unitWord(lang, 'call', block)}; ειδοποιήσεις προϊόντος: ${p}.`
}

export function progressionAllowanceText(lang: Lang, brand: ProgressionBrand, daily: number, monthly: number, mcpDaily: number, productMonthly: number): string {
  if (lang === 'en') return `${daily} free ${unitWord(lang, 'search', daily)} per day, ${monthly} per month; ${mcpDaily} free MCP ${unitWord(lang, 'call', mcpDaily)} per day; ${productMonthly} free product-mail ${unitWord(lang, 'subscription', productMonthly)} per month.`
  if (lang === 'de') return `${daily} kostenlose ${unitWord(lang, 'search', daily)} pro Tag, ${monthly} pro Monat; ${mcpDaily} kostenlose MCP-${unitWord(lang, 'call', mcpDaily)} pro Tag; ${productMonthly} kostenlose Produkt-Mail-${unitWord(lang, 'subscription', productMonthly)} pro Monat.`
  if (lang === 'ru') {
    const free = (n: number, feminine = false) => (n % 10 === 1 && n % 100 !== 11 ? (feminine ? 'бесплатная' : 'бесплатный') : 'бесплатных')
    return `${daily} ${free(daily)} ${unitWord(lang, 'search', daily)} в день, ${monthly} в месяц; ${mcpDaily} ${free(mcpDaily)} ${unitWord(lang, 'call', mcpDaily)} инструмента агента в день; ${productMonthly} ${free(productMonthly, true)} ${unitWord(lang, 'subscription', productMonthly)} товарных уведомлений в месяц.`
  }
  if (lang === 'ar') return `${daily} ${unitWord(lang, 'search', daily)} مجاني يومياً، ${monthly} شهرياً؛ ${mcpDaily} ${unitWord(lang, 'call', mcpDaily)} مجانياً لأداة الوكيل يومياً؛ ${productMonthly} ${unitWord(lang, 'subscription', productMonthly)} مجانياً لتنبيهات المنتجات شهرياً.`
  if (lang === 'he') return `${daily} ${unitWord(lang, 'search', daily)} חינם ביום, ${monthly} בחודש; ${mcpDaily} ${unitWord(lang, 'call', mcpDaily)} חינם של כלי סוכן ביום; ${productMonthly} ${unitWord(lang, 'subscription', productMonthly)} חינם של התראות מוצר בחודש.`
  return `${daily} δωρεάν ${unitWord(lang, 'search', daily)} την ημέρα, ${monthly} τον μήνα; ${mcpDaily} δωρεάν ${unitWord(lang, 'call', mcpDaily)} την ημέρα; ${productMonthly} δωρεάν ${unitWord(lang, 'subscription', productMonthly)} τον μήνα.`
}
