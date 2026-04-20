'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { tAdmin } from '@/lib/shop-admin-translations'
import type { PriceTier, PriceTierStep, PriceUnitOption } from '@/types/shop-admin'

interface Props {
  tiers: PriceTier[]
  onChange: (tiers: PriceTier[]) => void
  priceUnits: PriceUnitOption[]
  lang: string
}

function emptyStep(): PriceTierStep {
  return { min_quantity: 1, max_quantity: undefined, price: '', currency: 'EUR' }
}

function emptyTier(): PriceTier {
  return { unit: '', unit_label_custom: undefined, steps: [emptyStep()] }
}

function stepError(step: PriceTierStep, tr: ReturnType<typeof tAdmin>): string | null {
  if (step.max_quantity !== undefined && step.max_quantity < step.min_quantity) {
    return tr.tier_step_error_max_lt_min
  }
  if (!step.price || parseFloat(step.price) <= 0) {
    return tr.tier_step_error_price
  }
  return null
}

export function PriceTierEditor({ tiers, onChange, priceUnits, lang }: Props) {
  const tr = tAdmin(lang)

  function updateTier(idx: number, patch: Partial<PriceTier>) {
    const next = tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    onChange(next)
  }

  function removeTier(idx: number) {
    onChange(tiers.filter((_, i) => i !== idx))
  }

  function updateStep(tierIdx: number, stepIdx: number, patch: Partial<PriceTierStep>) {
    const steps = tiers[tierIdx].steps.map((s, i) => (i === stepIdx ? { ...s, ...patch } : s))
    updateTier(tierIdx, { steps })
  }

  function removeStep(tierIdx: number, stepIdx: number) {
    const steps = tiers[tierIdx].steps.filter((_, i) => i !== stepIdx)
    updateTier(tierIdx, { steps })
  }

  function addStep(tierIdx: number) {
    const steps = [...tiers[tierIdx].steps, emptyStep()]
    updateTier(tierIdx, { steps })
  }

  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40'
  const smallInputCls =
    'border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 w-full'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{tr.price_tiers_title}</span>
        <button
          type="button"
          onClick={() => onChange([...tiers, emptyTier()])}
          className="text-xs text-accent hover:underline"
        >
          + {tr.add_price_tier}
        </button>
      </div>

      {tiers.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
          {tr.add_price_tier}
        </p>
      )}

      {tiers.map((tier, tierIdx) => (
        <div key={tierIdx} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 bg-gray-50">
          {/* Unit selector */}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {tr.tier_unit_label}
              </label>
              <select
                value={tier.unit === 'custom' ? 'custom' : (priceUnits.some(u => u.code === tier.unit) ? tier.unit : '')}
                onChange={(e) => {
                  updateTier(tierIdx, {
                    unit: e.target.value,
                    unit_label_custom: e.target.value !== 'custom' ? undefined : tier.unit_label_custom,
                  })
                }}
                className={inputCls}
              >
                <option value="">—</option>
                {priceUnits.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.label || u.code}
                  </option>
                ))}
                <option value="custom">{tr.tier_unit_custom_placeholder}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeTier(tierIdx)}
              className="mt-6 text-xs text-gray-400 hover:text-red-500 shrink-0"
            >
              {tr.remove_tier}
            </button>
          </div>

          {/* Custom unit label */}
          {tier.unit === 'custom' && (
            <input
              type="text"
              placeholder={tr.tier_unit_custom_placeholder}
              value={tier.unit_label_custom ?? ''}
              onChange={(e) => updateTier(tierIdx, { unit_label_custom: e.target.value })}
              className={inputCls}
            />
          )}

          {/* Steps */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-gray-600">{tr.tier_steps_title}</span>

            {tier.steps.length === 0 && (
              <p className="text-xs text-orange-500">{tr.tier_no_steps}</p>
            )}

            {tier.steps.map((step, stepIdx) => {
              const err = stepError(step, tr)
              return (
                <div key={stepIdx} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{tr.step_min_qty}</label>
                      <input
                        type="number"
                        min={1}
                        value={step.min_quantity}
                        onChange={(e) => updateStep(tierIdx, stepIdx, { min_quantity: parseInt(e.target.value) || 1 })}
                        className={smallInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">
                        {tr.step_max_qty}
                        <span className="text-gray-400 ml-1">({tr.step_max_qty_hint})</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={step.max_quantity ?? ''}
                        placeholder="∞"
                        onChange={(e) => {
                          const v = e.target.value
                          updateStep(tierIdx, stepIdx, { max_quantity: v === '' ? undefined : parseInt(v) })
                        }}
                        className={smallInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{tr.step_price}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={step.price}
                        onChange={(e) => updateStep(tierIdx, stepIdx, { price: e.target.value })}
                        className={smallInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{tr.step_currency}</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={step.currency}
                        onChange={(e) => updateStep(tierIdx, stepIdx, { currency: e.target.value.toUpperCase() })}
                        className={smallInputCls}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStep(tierIdx, stepIdx)}
                      disabled={tier.steps.length <= 1}
                      className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-30 pb-1"
                    >
                      {tr.remove_step}
                    </button>
                  </div>
                  {err && <p className="text-xs text-red-500">{err}</p>}
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => addStep(tierIdx)}
              className="text-xs text-accent hover:underline self-start mt-1"
            >
              + {tr.add_step}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
