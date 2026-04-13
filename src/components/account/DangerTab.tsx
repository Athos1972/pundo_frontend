'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/translations'
import { useSetSession } from '@/components/auth/SessionProvider'
import { DeleteAccountModal } from './DeleteAccountModal'

interface Props {
  email: string
  lang: string
}

export function DangerTab({ email, lang }: Props) {
  const tr = t(lang)
  const router = useRouter()
  const setSession = useSetSession()
  const [showModal, setShowModal] = useState(false)

  function handleDeleted() {
    setShowModal(false)
    setSession({ user: null, is_authenticated: false })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="border border-red-200 rounded-xl p-5 bg-red-50/50 dark:bg-red-950/10 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-red-700">{tr.account_delete_title}</h3>
        <p className="text-sm text-text-muted">{tr.account_delete_warning}</p>
        <div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg border border-red-400 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            {tr.account_delete_title}…
          </button>
        </div>
      </section>

      {showModal && (
        <DeleteAccountModal
          lang={lang}
          email={email}
          onConfirmed={handleDeleted}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
