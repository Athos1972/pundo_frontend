'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState } from 'react'
import type { SysAdminCategoryAttributeDef } from '@/types/system-admin'

type AttrDefDraft = Omit<SysAdminCategoryAttributeDef, 'id' | 'category_id'>

interface AttributeDefinitionEditorProps {
  value: AttrDefDraft
  onChange: (v: AttrDefDraft) => void
  keyLabel: string
  labelLabel: string
  typeLabel: string
  optionsLabel: string
  optionsHint: string
}

export function AttributeDefinitionEditor({
  value,
  onChange,
  keyLabel,
  labelLabel,
  typeLabel,
  optionsLabel,
  optionsHint,
}: AttributeDefinitionEditorProps) {
  const [optionsInput, setOptionsInput] = useState(
    (value.options ?? []).join(', '),
  )

  function handleOptionsChange(raw: string) {
    setOptionsInput(raw)
    const parsed = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    onChange({ ...value, options: parsed.length > 0 ? parsed : null })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{keyLabel} <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={value.key}
          onChange={(e) => onChange({ ...value, key: e.target.value })}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{labelLabel} <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">{typeLabel}</label>
        <select
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as AttrDefDraft['type'] })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-slate-600"
        >
          <option value="text">text</option>
          <option value="number">number</option>
          <option value="bool">bool</option>
          <option value="select">select</option>
        </select>
      </div>

      {value.type === 'select' && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{optionsLabel}</label>
          <input
            type="text"
            value={optionsInput}
            onChange={(e) => handleOptionsChange(e.target.value)}
            placeholder="Option A, Option B, Option C"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
          {optionsHint && (
            <p className="text-xs text-gray-500">{optionsHint}</p>
          )}
          {(value.options ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(value.options ?? []).map((opt) => (
                <span
                  key={opt}
                  className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full"
                >
                  {opt}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
