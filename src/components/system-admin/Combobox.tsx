'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useState, useRef, useEffect, useId } from 'react'

export interface ComboboxItem {
  value: string
  label: string
  subLabel?: string
}

interface ComboboxProps {
  items: ComboboxItem[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
}

/**
 * Searchable select with priority sort:
 * 1. exact match  2. startsWith  3. includes (in label or subLabel)
 */
function filterItems(items: ComboboxItem[], query: string): ComboboxItem[] {
  if (!query.trim()) return items
  const q = query.toLowerCase()
  const exact: ComboboxItem[] = []
  const starts: ComboboxItem[] = []
  const contains: ComboboxItem[] = []
  const sub: ComboboxItem[] = []
  for (const item of items) {
    const l = item.label.toLowerCase()
    const s = item.subLabel?.toLowerCase() ?? ''
    if (l === q) { exact.push(item); continue }
    if (l.startsWith(q)) { starts.push(item); continue }
    if (l.includes(q)) { contains.push(item); continue }
    if (s.includes(q)) sub.push(item)
  }
  return [...exact, ...starts, ...contains, ...sub]
}

export function Combobox({
  items,
  value,
  onChange,
  placeholder = 'Search…',
  disabled = false,
  name,
  id: idProp,
}: ComboboxProps) {
  const generatedId = useId()
  const fieldId = idProp ?? generatedId
  const selected = items.find((i) => i.value === value)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = filterItems(items, query)

  // Close on click outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  function selectItem(item: ComboboxItem) {
    onChange(item.value)
    setOpen(false)
    setQuery('')
  }

  function clearSelection() {
    onChange('')
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return }
    if (e.key === 'ArrowDown') { setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); e.preventDefault() }
    if (e.key === 'ArrowUp') { setActiveIndex((i) => Math.max(i - 1, 0)); e.preventDefault() }
    if (e.key === 'Enter') {
      const item = filtered[activeIndex]
      if (item) { selectItem(item); e.preventDefault() }
    }
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger button */}
      <button
        type="button"
        id={fieldId}
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-start
          focus:outline-none focus:ring-2 focus:ring-slate-600 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? 'border-slate-500' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-gray-400 text-xs shrink-0">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="border-b border-gray-100 p-2 flex gap-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
              placeholder={placeholder}
              className="flex-1 text-sm px-2 py-1 focus:outline-none"
              autoComplete="off"
            />
            {(value || query) && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-gray-400 hover:text-gray-700 px-1"
                tabIndex={-1}
              >
                ✕
              </button>
            )}
          </div>

          {/* List */}
          <ul ref={listRef} className="max-h-56 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 italic">No results</li>
            ) : (
              filtered.map((item, idx) => (
                <li
                  key={item.value}
                  role="option"
                  aria-selected={item.value === value}
                  onClick={() => selectItem(item)}
                  className={`px-3 py-2 cursor-pointer flex flex-col
                    ${idx === activeIndex ? 'bg-slate-100' : 'hover:bg-gray-50'}
                    ${item.value === value ? 'font-medium' : ''}`}
                >
                  <span className="text-sm text-gray-900">{item.label}</span>
                  {item.subLabel && (
                    <span className="text-xs text-gray-400 font-mono truncate">{item.subLabel}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
