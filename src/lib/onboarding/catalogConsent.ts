/**
 * Version of the catalog-onboarding consent text (F5980 AC1).
 *
 * One source for the wizard checkbox and the portal card. Must be one of the versions the
 * backend accepts (CATALOG_CONSENT_TEXT_VERSIONS in ingestor/schemas/catalog_consent.py).
 * A published version's wording (src/lib/i18n/shop-admin-catalog-consent.ts) is NEVER edited:
 * any change of wording = new version here AND in the backend allowlist.
 */
export const CATALOG_CONSENT_TEXT_VERSION = '2026-10-16.v1'
