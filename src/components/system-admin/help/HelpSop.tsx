import type { HelpTopicContent } from '@/lib/system-admin-help-content'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface HelpSopProps {
  content: HelpTopicContent
  tr: SysAdminTranslations
}

export function HelpSop({ content, tr }: HelpSopProps) {
  return (
    <div className="flex flex-col gap-4">
      {content.rules && content.rules.length > 0 && (
        <section
          aria-labelledby="help-rules-heading"
          data-testid="help-rules"
          className="rounded-lg border-2 border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-950"
        >
          <h2 id="help-rules-heading" className="text-base font-semibold">{tr.help_rules_title}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 ps-5">
            {content.rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="help-steps-heading" className="flex flex-col gap-3">
        <h2 id="help-steps-heading" className="text-lg font-semibold text-gray-900">{tr.help_steps_title}</h2>
        <ol className="flex list-decimal flex-col gap-2 ps-6 text-sm text-gray-800">
          {content.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        {content.sections?.map((section, s) => (
          <div key={s} className="flex flex-col gap-2" data-testid="help-section">
            <h3 id={`help-section-${s}`} className="pt-2 text-base font-semibold text-gray-900">{section.heading}</h3>
            <ol aria-labelledby={`help-section-${s}`} className="flex list-decimal flex-col gap-2 ps-6 text-sm text-gray-800">
              {section.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
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
