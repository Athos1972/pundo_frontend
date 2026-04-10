interface LanguageChipsProps {
  languages: string[]
  label: string
}

export function LanguageChips({ languages, label }: LanguageChipsProps) {
  if (languages.length === 0) return null

  return (
    <div>
      <p className="text-xs text-text-muted mb-1.5">{label}</p>
      <div
        className="flex flex-wrap gap-1.5"
        aria-label={label}
        role="list"
      >
        {languages.map((lang) => (
          <span
            key={lang}
            role="listitem"
            className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-alt text-text-muted cursor-default select-none"
          >
            {lang.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  )
}
