// ─── Customer Auth & Session Types ────────────────────────────────────────────
// IMPORTANT: These types are customer-facing only.
// Shop-admin types live in src/types/shop-admin.ts — never mix.

export interface AuthUser {
  id: number
  email: string
  display_name: string
  is_verified: boolean
  provider: 'email' | 'google'
  avatar_url?: string
  has_password?: boolean
  created_at: string
}

export interface LinkedProvider {
  provider: 'google'
  linked: boolean
  can_unlink: boolean
}

export interface LinkedAccountsResponse {
  providers: LinkedProvider[]
  has_password: boolean
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

// ─── OAuth / MCP Types ─────────────────────────────────────────────────────────

export interface OAuthScopeDescription {
  scope: string
  description_de: string
  description_en: string
}

export interface OAuthAuthorizationContext {
  client: { client_id: string; client_name: string }
  scope: string
  scope_descriptions: OAuthScopeDescription[]
  redirect_uri: string
  state: string
  code_challenge: string
  code_challenge_method: string
}

export interface OAuthDecisionRequest {
  decision: 'allow' | 'deny'
  client_id: string
  redirect_uri: string
  scope: string
  state: string
  code_challenge: string
  code_challenge_method: string
}

export interface OAuthDecisionResponse {
  redirect_to: string
}

export interface OAuthConnection {
  client_id: string
  client_name: string
  scope: string
  first_authorized_at: string
  last_used_at: string | null
}

export interface OAuthConnectionsResponse {
  connections: OAuthConnection[]
}
