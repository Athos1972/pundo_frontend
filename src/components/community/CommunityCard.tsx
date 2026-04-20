import { Send } from 'lucide-react'
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

  const slug = brand.slug as 'naidivse'
  const nameKey = `community_name_${slug}` as keyof typeof tr
  const localizedName = (tr[nameKey] as string | undefined) ?? telegramName

  const formattedCount = memberCount != null
    ? new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : lang === 'he' ? 'he-IL' : lang).format(Number(String(memberCount).replace(/[.,]/g, '')))
    : null

  return (
    <section className="py-4">
      <div className="max-w-6xl mx-auto px-6">
        <div className="rounded-2xl bg-surface border border-border px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#2AABEE' }}
            >
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-text">{localizedName}</p>
              <p className="text-sm text-text-muted">
                {telegramName !== localizedName && (
                  <span className="mr-1 rtl:mr-0 rtl:ml-1">{telegramName} ·</span>
                )}
                {formattedCount && `${formattedCount} ${tr.community_members}`}
              </p>
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
