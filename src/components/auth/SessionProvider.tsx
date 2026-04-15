'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { CustomerSession } from '@/types/customer'

interface SessionContextValue {
  session: CustomerSession
  setSession: (session: CustomerSession) => void
}

const SessionContext = createContext<SessionContextValue>({
  session: { user: null, is_authenticated: false },
  setSession: () => {},
})

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession: CustomerSession
}) {
  const [session, setSession] = useState<CustomerSession>(initialSession)

  // Sync local state when the server sends a new session via props.
  // Essential after flows that change the server-side cookie (Google OAuth
  // callback, email/password login, logout) and then call router.refresh():
  // Next.js re-renders the server layout which re-fetches the session and
  // passes a fresh initialSession down. Without this effect, React's useState
  // would hold onto the original mount-time value forever and the UI would
  // look "still signed out" until a full page reload.
  useEffect(() => {
    setSession(initialSession)
  }, [initialSession])

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): CustomerSession {
  return useContext(SessionContext).session
}

export function useSetSession(): (session: CustomerSession) => void {
  return useContext(SessionContext).setSession
}
