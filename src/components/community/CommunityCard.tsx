import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import type { BrandConfig } from '@/config/brands'

interface Props {
  brand: BrandConfig
}

export async function CommunityCard({ brand }: Props) {
  if (!brand.community) return null

  const lang = await getLangServer()
  const tr = t(lang)
  const { telegramName, telegramUrl, memberCount } = brand.community

  return (
    <section className="px-6 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl bg-surface border border-border px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✈️</span>
            <div>
              <p className="font-semibold text-text">{telegramName}</p>
              {memberCount && (
                <p className="text-sm text-text-muted">{memberCount} {tr.community_members}</p>
              )}
            </div>
          </div>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-dark)] transition-colors"
          >
            {tr.community_join}
          </a>
        </div>
      </div>
    </section>
  )
}
