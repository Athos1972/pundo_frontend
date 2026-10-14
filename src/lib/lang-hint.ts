// src/lib/lang-hint.ts — Signal "Sprache bewusst gewählt" für den LanguageHint (F6310).
//
// app_lang taugt dafür nicht: src/proxy.ts setzt es bei jeder /{lang}-Antwort automatisch.
// lang_hint_dismissed wird nur durch eine Nutzeraktion gesetzt (Hinweis geschlossen,
// Sprache im Hinweis oder im Header-Umschalter gewählt).

export const LANG_HINT_COOKIE = 'lang_hint_dismissed'
const LANG_HINT_EVENT = 'pundo:lang-hint-dismissed'

export function isLangHintDismissed(): boolean {
  if (typeof document === 'undefined') return true
  return new RegExp(`(?:^|;\\s*)${LANG_HINT_COOKIE}=`).test(document.cookie)
}

/** Setzt das Cookie (1 Jahr) und informiert einen ggf. sichtbaren Hinweis. */
export function markLangHintDismissed(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${LANG_HINT_COOKIE}=1;path=/;max-age=31536000;SameSite=Lax;Secure`
  window.dispatchEvent(new Event(LANG_HINT_EVENT))
}

/** Subscribe-Funktion für useSyncExternalStore. */
export function subscribeLangHint(onChange: () => void): () => void {
  window.addEventListener(LANG_HINT_EVENT, onChange)
  return () => window.removeEventListener(LANG_HINT_EVENT, onChange)
}
