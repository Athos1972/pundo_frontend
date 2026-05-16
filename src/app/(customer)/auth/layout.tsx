import type { Metadata } from 'next'

// Auth routes must never be indexed — they are transient UI (login, signup,
// password-reset, callback). A segment-level layout metadata applies to every
// page in this directory tree, including client components that cannot export
// metadata themselves.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
