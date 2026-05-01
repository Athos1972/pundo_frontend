import type { OnboardingDraft } from '@/types/shop-admin'

const STORAGE_KEY = 'pundo.onboarding.draft.v1'
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const CURRENT_VERSION = 1 as const

export function saveDraft(draft: Omit<OnboardingDraft, 'version' | 'expiresAt'>): void {
  if (typeof window === 'undefined') return
  const full: OnboardingDraft = {
    ...draft,
    version: CURRENT_VERSION,
    expiresAt: Date.now() + TTL_MS,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
  } catch {
    // Ignore quota errors — draft is best-effort
  }
}

export function loadDraft(): OnboardingDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>
    if (parsed.version !== CURRENT_VERSION) {
      clearDraft()
      return null
    }
    if (typeof parsed.expiresAt === 'number' && parsed.expiresAt < Date.now()) {
      clearDraft()
      return null
    }
    return parsed as OnboardingDraft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export function draftAgeMs(): number | null {
  const draft = loadDraft()
  if (!draft) return null
  return TTL_MS - (draft.expiresAt - Date.now())
}
