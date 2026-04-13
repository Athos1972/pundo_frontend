'use client'

import { useState } from 'react'
import { t } from '@/lib/translations'
import { ProfileTab } from './ProfileTab'
import { SecurityTab } from './SecurityTab'
import { ReviewsTab } from './ReviewsTab'
import { DangerTab } from './DangerTab'
import type { AuthUser, LinkedAccountsResponse } from '@/types/customer'
import type { Review } from '@/types/api'

type Tab = 'profile' | 'security' | 'reviews' | 'danger'

interface Props {
  initialUser: AuthUser
  linkedAccounts: LinkedAccountsResponse | null
  reviews: Review[]
  lang: string
}

export function AccountTabs({ initialUser, linkedAccounts, reviews, lang }: Props) {
  const tr = t(lang)
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [user, setUser] = useState<AuthUser>(initialUser)

  function handleUserChange(updated: Partial<AuthUser>) {
    setUser((prev) => ({ ...prev, ...updated }))
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: tr.account_tab_profile },
    { id: 'security', label: tr.account_tab_security },
    { id: 'reviews', label: tr.account_tab_reviews },
    { id: 'danger', label: tr.account_tab_danger },
  ]

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Tab list */}
      <nav
        role="tablist"
        aria-label="Account sections"
        className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible md:min-w-[160px] md:shrink-0 pb-1 md:pb-0"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-colors text-start',
              activeTab === tab.id
                ? 'bg-accent text-white'
                : 'text-text-muted hover:bg-surface-alt hover:text-text',
              tab.id === 'danger' && activeTab !== 'danger'
                ? 'text-red-500 hover:text-red-600'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab panels */}
      <div className="flex-1 min-w-0">
        <div
          role="tabpanel"
          id="tabpanel-profile"
          aria-labelledby="tab-profile"
          hidden={activeTab !== 'profile'}
        >
          {activeTab === 'profile' && (
            <ProfileTab
              user={user}
              linkedAccounts={linkedAccounts}
              lang={lang}
              onUserChange={handleUserChange}
            />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-security"
          aria-labelledby="tab-security"
          hidden={activeTab !== 'security'}
        >
          {activeTab === 'security' && (
            <SecurityTab user={user} lang={lang} onUserChange={handleUserChange} />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-reviews"
          aria-labelledby="tab-reviews"
          hidden={activeTab !== 'reviews'}
        >
          {activeTab === 'reviews' && (
            <ReviewsTab reviews={reviews} lang={lang} />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-danger"
          aria-labelledby="tab-danger"
          hidden={activeTab !== 'danger'}
        >
          {activeTab === 'danger' && (
            <DangerTab email={user.email} lang={lang} />
          )}
        </div>
      </div>
    </div>
  )
}
