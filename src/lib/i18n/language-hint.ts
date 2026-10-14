// src/lib/i18n/language-hint.ts — Language-Hint namespace (F6310, ersetzt LanguagePickerOverlay)
// Placeholder `{lang}` wird in der Komponente durch die Eigenbezeichnung der Sprache ersetzt.
const languageHintTranslations = {
  en: {
    lang_hint_region_label: 'Language selection',
    lang_hint_language: 'Language',
    lang_hint_change: 'Change',
    lang_hint_close: 'Close language hint',
    lang_hint_list_label: 'Choose language',
    lang_hint_suggest_aria: 'Switch to {lang}',
  },
  de: {
    lang_hint_region_label: 'Sprachauswahl',
    lang_hint_language: 'Sprache',
    lang_hint_change: 'Ändern',
    lang_hint_close: 'Sprach-Hinweis schließen',
    lang_hint_list_label: 'Sprache wählen',
    lang_hint_suggest_aria: 'Zu {lang} wechseln',
  },
  ru: {
    lang_hint_region_label: 'Выбор языка',
    lang_hint_language: 'Язык',
    lang_hint_change: 'Изменить',
    lang_hint_close: 'Закрыть подсказку о языке',
    lang_hint_list_label: 'Выберите язык',
    lang_hint_suggest_aria: 'Переключить на {lang}',
  },
  el: {
    lang_hint_region_label: 'Επιλογή γλώσσας',
    lang_hint_language: 'Γλώσσα',
    lang_hint_change: 'Αλλαγή',
    lang_hint_close: 'Κλείσιμο υπόδειξης γλώσσας',
    lang_hint_list_label: 'Επιλέξτε γλώσσα',
    lang_hint_suggest_aria: 'Αλλαγή σε {lang}',
  },
  ar: {
    lang_hint_region_label: 'اختيار اللغة',
    lang_hint_language: 'اللغة',
    lang_hint_change: 'تغيير',
    lang_hint_close: 'إغلاق تلميح اللغة',
    lang_hint_list_label: 'اختر اللغة',
    lang_hint_suggest_aria: 'التبديل إلى {lang}',
  },
  he: {
    lang_hint_region_label: 'בחירת שפה',
    lang_hint_language: 'שפה',
    lang_hint_change: 'שינוי',
    lang_hint_close: 'סגירת הודעת השפה',
    lang_hint_list_label: 'בחר שפה',
    lang_hint_suggest_aria: 'מעבר ל{lang}',
  },
} as const

export type LanguageHintTranslations = typeof languageHintTranslations.en
export function tLanguageHint(lang: string): LanguageHintTranslations {
  return (languageHintTranslations[lang as keyof typeof languageHintTranslations] ?? languageHintTranslations.en) as unknown as LanguageHintTranslations
}
export { languageHintTranslations }
