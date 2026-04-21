'use client'

import type { TrustProfileResponse } from '@/types/api'
import type { Translations } from '@/lib/translations'

const BADGE_LABEL_KEY: Record<string, keyof Translations> = {
  island_hero: 'trust_badge_island_hero',
  local_legend: 'trust_badge_local_legend',
  walker: 'trust_badge_walker',
}

const BADGE_EMOJI: Record<string, string> = {
  island_hero: '🏝️',
  local_legend: '🌟',
  walker: '🚶',
}

interface Props {
  profile: TrustProfileResponse
  tr: Translations
}

export function TrustProfileSection({ profile, tr }: Props) {
  return (
    <div className="space-y-6">
      {/* Level + Credits */}
      <div className="flex gap-4">
        <div className="flex-1 bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-text-muted mb-1">{tr.trust_level}</p>
          <p className="text-3xl font-extrabold text-accent" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>
            {profile.trust_level}
          </p>
          <p className="text-xs text-text-muted mt-1">{tr.trust_level_label(profile.trust_level)}</p>
        </div>
        <div className="flex-1 bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-text-muted mb-1">{tr.trust_credits}</p>
          <p className="text-3xl font-extrabold text-accent" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>
            {profile.credits}
          </p>
          <p className="text-xs text-text-muted mt-1">{tr.trust_credits_earned(profile.credits)}</p>
        </div>
      </div>

      {/* Credit thresholds */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-1">
        {[
          { level: 1, threshold: 0 },
          { level: 2, threshold: 50 },
          { level: 3, threshold: 200 },
        ].map(({ level, threshold }) => (
          <div key={level} className="flex items-center justify-between text-sm rtl:flex-row-reverse">
            <span className={profile.trust_level >= level ? 'text-accent font-medium' : 'text-text-muted'}>
              {tr.trust_level_label(level)}
            </span>
            <span className={profile.trust_level >= level ? 'text-accent' : 'text-text-light'}>
              {threshold} pts
              {profile.trust_level >= level && ' ✓'}
            </span>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3 rtl:text-right">{tr.trust_badges}</h3>
        {profile.badges.length === 0 ? (
          <p className="text-sm text-text-muted rtl:text-right">{tr.trust_no_badges}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {profile.badges.map((b) => (
              <div
                key={b.badge_type}
                className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2"
              >
                <span className="text-xl">{BADGE_EMOJI[b.badge_type] ?? '🏅'}</span>
                <div>
                  <p className="text-sm font-medium text-text">
                    {tr[BADGE_LABEL_KEY[b.badge_type] ?? 'trust_badges'] as string}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(b.awarded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
