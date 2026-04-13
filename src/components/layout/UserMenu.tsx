'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, useSetSession } from '@/components/auth/SessionProvider'
import { t } from '@/lib/translations'

interface Props {
  lang: string
}

export function UserMenu({ lang }: Props) {
  const tr = t(lang)
  const session = useSession()
  const setSession = useSetSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  if (!session.is_authenticated || !session.user) {
    return (
      <Link
        href="/auth/login"
        className="text-sm font-medium px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
      >
        {tr.auth_login}
      </Link>
    )
  }

  const user = session.user
  const initial = user.display_name.charAt(0).toUpperCase()

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/customer/customer/auth/logout', { method: 'POST' })
    } catch {
      // best-effort
    }
    setSession({ user: null, is_authenticated: false })
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={user.display_name}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-alt transition-colors"
      >
        {/* Avatar or initial */}
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={user.display_name}
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initial}
          </span>
        )}
        <span className="text-sm font-medium text-text max-w-[120px] truncate hidden sm:block">
          {user.display_name}
        </span>
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-1 w-44 bg-surface border border-border rounded-xl shadow-lg py-1 z-50"
        >
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface-alt transition-colors"
          >
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {tr.auth_account}
          </Link>
          <hr className="my-1 border-border" />
          <button
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface-alt transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {tr.auth_logout}
          </button>
        </div>
      )}
    </div>
  )
}
