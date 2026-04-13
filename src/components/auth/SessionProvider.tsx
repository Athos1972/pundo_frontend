'use client'

import { createContext, useContext, useState } from 'react'
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
