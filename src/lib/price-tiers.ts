// F5200: View-Model fuer Staffelpreise & Einheiten in der Kundensicht.
// Rein funktional (kein React). Customer-Code — kein Bezug zu shop-admin.
import type { OfferDetail, PriceType, PublicPriceTier } from '@/types/api'
import type { ShopTranslations } from '@/lib/i18n/shop'
import { formatAmount, parsePriceAmount } from '@/lib/utils'

export interface TierRow {
  minQty: number
  maxQty: number | null
  /** "4.00 EUR" */
  amount: string
  /** Numerischer Betrag (fuer JSON-LD). */
  price: number
  currency: string
  /** Einheiten-Code des Tiers (z. B. "per_piece"). */
  unit: string
  /** Lokalisiertes Label wie vom Backend geliefert (auch bei unit "fixed"). */
  unitLabel: string | null
  /** Label fuer "/ {label}"-Suffix; null bei "fixed" oder fehlendem Label. */
  unitSuffix: string | null
}

export type CompareStrike = 'same-unit' | 'different-unit' | 'unknown' | 'none'

export interface PriceViewInput {
  priceType: PriceType
  /** Legacy-Entscheider: formatAmount(promo_price, …) !== null. */
  isPromo: boolean
  priceTiers?: PublicPriceTier[] | null
  promoPriceTiers?: PublicPriceTier[] | null
}

export interface OfferPriceView {
  hasTiers: boolean
  main: TierRow | null
  /** main.minQty > 1 → "ab 3 · …" */
  mainShowMinQty: boolean
  compareStrike: CompareStrike
  /** Nur bei 'same-unit': Betrag des ersten Standard-Steps. */
  compareAmount: string | null
  extraRows: TierRow[]
}

/** UN/CEFACT-Codes fuer JSON-LD `unitCode`. Kein Code fuer package/session/fixed/custom/Legacy. */
export const UNIT_CEFACT_CODES: Record<string, string> = {
  per_piece: 'H87',
  per_hour: 'HUR',
  per_day: 'DAY',
  per_m2: 'MTK',
  per_m3: 'MTQ',
  per_kg: 'KGM',
  per_liter: 'LTR',
}

export function unitSuffix(tier: Pick<PublicPriceTier, 'unit' | 'unit_label'>): string | null {
  const label = typeof tier.unit_label === 'string' ? tier.unit_label.trim() : ''
  if (tier.unit === 'fixed' || !label) return null
  return label
}

/** Gueltige Zeilen je Tier (defensiv: kaputte Steps/leere Tiers entfallen, Steps sortiert). */
function rowsPerTier(tiers: PublicPriceTier[] | null | undefined): TierRow[][] {
  if (!Array.isArray(tiers)) return []
  const result: TierRow[][] = []
  for (const tier of tiers) {
    if (!tier || !Array.isArray(tier.steps)) continue
    const rows: TierRow[] = []
    for (const step of tier.steps) {
      if (!step) continue
      const price = parsePriceAmount(step.price)
      const amount = formatAmount(step.price, step.currency)
      if (price === null || amount === null) continue
      const min = Number(step.min_quantity)
      if (!Number.isFinite(min)) continue
      const max = step.max_quantity === null || step.max_quantity === undefined ? null : Number(step.max_quantity)
      rows.push({
        minQty: min,
        maxQty: max !== null && Number.isFinite(max) ? max : null,
        amount,
        price,
        currency: step.currency,
        unit: tier.unit,
        unitLabel: tier.unit_label ?? null,
        unitSuffix: unitSuffix(tier),
      })
    }
    if (rows.length === 0) continue
    rows.sort((a, b) => a.minQty - b.minQty)
    result.push(rows)
  }
  return result
}

const EMPTY_VIEW: OfferPriceView = {
  hasTiers: false,
  main: null,
  mainShowMinQty: false,
  compareStrike: 'unknown',
  compareAmount: null,
  extraRows: [],
}

export function buildOfferPriceView(input: PriceViewInput): OfferPriceView {
  if (input.priceType !== 'fixed') return EMPTY_VIEW

  const promoGroups = input.isPromo ? rowsPerTier(input.promoPriceTiers) : []
  const stdGroups = rowsPerTier(input.priceTiers)
  const usePromo = promoGroups.length > 0
  const groups = usePromo ? promoGroups : stdGroups
  if (groups.length === 0) return EMPTY_VIEW

  const flat = groups.flat()
  const main = flat[0]

  let compareStrike: CompareStrike = 'unknown'
  let compareAmount: string | null = null
  if (usePromo) {
    if (!Array.isArray(input.priceTiers)) {
      compareStrike = 'unknown'
    } else if (stdGroups.length === 0) {
      compareStrike = 'none'
    } else if (stdGroups[0][0].unit === main.unit) {
      compareStrike = 'same-unit'
      compareAmount = stdGroups[0][0].amount
    } else {
      compareStrike = 'different-unit'
    }
  }

  return {
    hasTiers: true,
    main,
    mainShowMinQty: main.minQty > 1,
    compareStrike,
    compareAmount,
    extraRows: flat.slice(1),
  }
}

export interface FormattedTierRow {
  /** z. B. "ab 6" / "6–11"; null ohne Praefix. Komponente ergaenzt ": " bzw. " · ". */
  prefix: string | null
  amount: string
  suffix: string | null
}

type TierTr = Pick<ShopTranslations, 'tier_from' | 'tier_range'>

/** Zeilenformat fuer Zusatzzeilen (FA2). `main`: nur "ab N" bei minQty > 1, nie Range. */
export function formatTierRow(row: TierRow, tr: TierTr, opts?: { main?: boolean }): FormattedTierRow {
  let prefix: string | null
  if (opts?.main) {
    prefix = row.minQty > 1 ? tr.tier_from(row.minQty) : null
  } else if (row.minQty <= 1 && row.maxQty === null) {
    prefix = null
  } else if (row.maxQty !== null && row.maxQty > row.minQty) {
    prefix = tr.tier_range(row.minQty, row.maxQty)
  } else {
    prefix = tr.tier_from(row.minQty)
  }
  return { prefix, amount: row.amount, suffix: row.unitSuffix }
}

/** Reiner Text einer Zeile, z. B. "ab 6: 4.00 EUR / Stück" (fuer Tests/ARIA). */
export function formatTierRowText(row: TierRow, tr: TierTr, opts?: { main?: boolean }): string {
  const f = formatTierRow(row, tr, opts)
  const sep = opts?.main ? ' · ' : ': '
  return `${f.prefix ? f.prefix + sep : ''}${f.amount}${f.suffix ? ` / ${f.suffix}` : ''}`
}

function toDate(v: string | null | undefined): string | null {
  if (!v) return null
  const m = /^\d{4}-\d{2}-\d{2}/.exec(v)
  return m ? m[0] : null
}

function specFor(row: TierRow, extra: Record<string, unknown>): Record<string, unknown> {
  const unitCode = UNIT_CEFACT_CODES[row.unit]
  const eligibleQuantity: Record<string, unknown> = {
    '@type': 'QuantitativeValue',
    minValue: row.minQty,
    ...(row.maxQty !== null ? { maxValue: row.maxQty } : {}),
  }
  if (row.unitSuffix) {
    if (unitCode) eligibleQuantity.unitCode = unitCode
    eligibleQuantity.unitText = row.unitSuffix
  }
  return {
    '@type': 'UnitPriceSpecification',
    price: row.price.toFixed(2),
    priceCurrency: row.currency,
    eligibleQuantity,
    ...extra,
  }
}

/**
 * JSON-LD `priceSpecification` fuer ein fixed-Offer (BB: MVP-Pflicht).
 * undefined, wenn effektive Tiers < 2 Zeilen haben und keine Aktion aktiv ist.
 */
export function buildPriceSpecifications(
  offer: Pick<OfferDetail, 'price_type' | 'price_tiers' | 'promo_price_tiers' | 'promo_valid_from' | 'promo_valid_until'>,
): Record<string, unknown>[] | undefined {
  if (offer.price_type !== 'fixed') return undefined
  const promoGroups = rowsPerTier(offer.promo_price_tiers)
  const stdGroups = rowsPerTier(offer.price_tiers)
  const isPromo = promoGroups.length > 0
  const groups = isPromo ? promoGroups : stdGroups
  const rows = groups.flat()
  if (rows.length === 0) return undefined
  if (rows.length < 2 && !isPromo) return undefined

  const validFrom = toDate(offer.promo_valid_from)
  const validThrough = toDate(offer.promo_valid_until)
  const dates: Record<string, unknown> = isPromo
    ? { ...(validFrom ? { validFrom } : {}), ...(validThrough ? { validThrough } : {}) }
    : {}

  const specs = rows.map((r) => specFor(r, dates))
  if (isPromo && stdGroups.length > 0 && stdGroups[0][0].unit === rows[0].unit) {
    const std = stdGroups[0][0]
    specs.push({
      '@type': 'UnitPriceSpecification',
      priceType: 'https://schema.org/StrikethroughPrice',
      price: std.price.toFixed(2),
      priceCurrency: std.currency,
    })
  }
  return specs
}
