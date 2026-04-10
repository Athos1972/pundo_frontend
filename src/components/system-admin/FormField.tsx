// Only imports from src/components/ui/ allowed (Clean Boundary)
import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  as?: 'input' | 'textarea' | 'select'
  rows?: number
  children?: React.ReactNode
  hint?: string
}

export function FormField({
  label,
  error,
  as = 'input',
  rows = 3,
  children,
  className,
  id,
  hint,
  ...props
}: FormFieldProps) {
  const fieldId = id ?? props.name

  const baseClass = `w-full rounded-lg border px-3 py-2 text-sm
    focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
    ${className ?? ''}`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
        {label}
        {props.required && <span className="text-red-500 ms-1">*</span>}
      </label>

      {as === 'textarea' ? (
        <textarea
          id={fieldId}
          name={props.name}
          rows={rows}
          required={props.required}
          disabled={props.disabled}
          defaultValue={props.defaultValue as string}
          value={props.value as string}
          onChange={props.onChange as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
          placeholder={props.placeholder}
          className={baseClass}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        />
      ) : as === 'select' ? (
        <select
          id={fieldId}
          name={props.name}
          required={props.required}
          disabled={props.disabled}
          value={props.value as string}
          defaultValue={props.defaultValue as string}
          onChange={props.onChange as unknown as React.ChangeEventHandler<HTMLSelectElement>}
          className={baseClass}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        >
          {children}
        </select>
      ) : (
        <input
          id={fieldId}
          {...props}
          className={baseClass}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        />
      )}

      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
