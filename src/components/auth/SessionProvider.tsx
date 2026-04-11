'use client'

import { createContext, useContext, useState } from 'react'
import type { CustomerSession } from '@/types/customer'

const SessionContext = createContext<CustomerSession>({
  user: null,
  is_authenticated: false,
})

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession: CustomerSession
}) {
  const [session] = useState<CustomerSession>(initialSession)
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): CustomerSession {
  return useContext(SessionContext)
}
