/**
 * Frontend validation helpers for F5910 shop-name field.
 * Length measured in Unicode code points (via spread) — not UTF-16 units.
 * This matches the backend's `len([*trimmed])` in Python.
 */

export type ShopNameValidation =
  | { ok: true; value: string }
  | { ok: false; code: 'required' | 'too_short' | 'too_long' }

export function validateShopName(raw: string): ShopNameValidation {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, code: 'required' }
  const codePoints = [...trimmed].length
  if (codePoints < 2) return { ok: false, code: 'too_short' }
  if (codePoints > 120) return { ok: false, code: 'too_long' }
  return { ok: true, value: trimmed }
}
