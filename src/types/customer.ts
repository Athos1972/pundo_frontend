// ─── Customer Auth & Session Types ────────────────────────────────────────────
// IMPORTANT: These types are customer-facing only.
// Shop-admin types live in src/types/shop-admin.ts — never mix.

export interface AuthUser {
  id: number
  email: string
  display_name: string
  is_verified: boolean
  provider: 'email' | 'google'
  created_at: string
}

export interface CustomerSession {
  user: AuthUser | null
  is_authenticated: boolean
}

export interface SignupRequest {
  email: string
  password: string
  display_name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface VerifyOtpRequest {
  email: string
  otp: string
  purpose: 'signup' | 'password_reset'
}

export interface ResendOtpRequest {
  email: string
  purpose: 'signup' | 'password_reset'
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirmRequest {
  email: string
  otp: string
  new_password: string
}
