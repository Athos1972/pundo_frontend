import type { HelpTopicContent } from '@/lib/system-admin-help-content'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface HelpSopProps {
  content: HelpTopicContent
  tr: SysAdminTranslations
}

export function HelpSop({ content, tr }: HelpSopProps) {
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="help-steps-heading" className="flex flex-col gap-3">
        <h2 id="help-steps-heading" className="text-lg font-semibold text-gray-900">{tr.help_steps_title}</h2>
        <ol className="flex list-decimal flex-col gap-2 ps-6 text-sm text-gray-800">
          {content.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>
      {content.notes?.map((note, i) => (
        <aside
          key={i}
          role="note"
          data-kind={note.kind}
          className={`rounded-lg border px-4 py-3 text-sm ${
            note.kind === 'warning'
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          <strong className="font-semibold">
            {note.kind === 'warning' ? tr.help_warning_label : tr.help_tip_label}
          </strong>{' '}
          {note.text}
        </aside>
      ))}
    </div>
  )
}
