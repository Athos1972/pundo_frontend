// Maps the English `detail` strings of POST /shop-owner/auth/login to translation keys, so the login page
// never shows raw backend text. Unknown or missing details fall back to the generic translated error.
import type { tAdmin } from '@/lib/shop-admin-translations'

type Tr = ReturnType<typeof tAdmin>

export function loginErrorMessage(detail: unknown, tr: Tr): string {
  if (typeof detail === 'string') {
    switch (detail) {
      case 'Invalid credentials':
        return tr.login_error_invalid_credentials
      case 'Account pending approval':
        return tr.login_error_pending_approval
      case 'Account rejected':
        return tr.login_error_rejected
    }
  }
  return tr.error_generic
}
