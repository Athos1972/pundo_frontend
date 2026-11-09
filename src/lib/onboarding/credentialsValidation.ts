// Client-side checks mirroring the backend (core/auth/password.py: NewPassword; EmailStr).

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_BYTES = 72

export type PasswordError = 'short' | 'long' | null

export function validatePassword(password: string): PasswordError {
  if (password.length < PASSWORD_MIN_LENGTH) return 'short'
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return 'long'
  return null
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}
