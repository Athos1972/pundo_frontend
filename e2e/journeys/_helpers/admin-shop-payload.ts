/**
 * Typed helper for POST /api/v1/admin/shops — AdminShopCreate payload.
 *
 * This mirrors `AdminShopCreate` from:
 *   pundo_main_backend/ingestor/schemas/admin.py:89–116
 *
 * IMPORTANT: The following fields from old test payloads do NOT exist in this schema
 * and TypeScript will refuse to compile if you add them:
 *   - name        (use `names: { en: "..." }` instead)
 *   - address_raw (use `address_line1` + `city` instead)
 *   - owner_id    (Admin-created shops have no owner — link separately if needed)
 */

export interface AdminShopCreatePayload {
  /** Required. URL-safe unique slug for the shop. */
  slug: string
  /** Required. Display names keyed by language code (e.g. { en: "My Shop", de: "Mein Shop" }). */
  names: Record<string, string>
  /** Default: 'active'. */
  status?: string
  descriptions?: Record<string, string>
  address_line1?: string
  address_line2?: string
  city?: string
  postal_code?: string
  /** Default: 'CY'. */
  country_code?: string
  lat?: number
  lng?: number
  phone?: string
  phone_alt?: string
  whatsapp_number?: string
  email?: string
  website_url?: string
  webshop_url?: string
  social_links?: Record<string, string>
  opening_hours?: unknown
  spoken_languages?: string[]
  delivery_services?: string[]
  has_parking?: boolean
  has_own_delivery?: boolean
  /** Default: false. */
  is_online_only?: boolean
  sells_live_animals?: boolean
  images?: unknown[]
  shop_type_id?: number
}

/**
 * Builder for AdminShopCreatePayload with sensible defaults.
 *
 * Defaults:
 *   - country_code: 'CY'
 *   - status: 'active'
 *   - is_online_only: false
 *
 * Required opts: `slug` and `names`.
 *
 * @example
 * buildAdminShopPayload({
 *   slug: `${PREFIX}-shop-b`,
 *   names: { en: 'Shop B (e2e)' },
 *   address_line1: 'Mackenzie Beach, Larnaca',
 *   city: 'Larnaca',
 *   lat: 34.9050,
 *   lng: 33.6183,
 * })
 */
export function buildAdminShopPayload(
  opts: AdminShopCreatePayload
): AdminShopCreatePayload {
  return {
    country_code: 'CY',
    status: 'active',
    is_online_only: false,
    ...opts,
  }
}
