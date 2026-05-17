// Server Component — no 'use client' needed, purely presentational.
// Rendered inside the Profile page (Server Component) with data already fetched.

import type { WebsiteStatusResponse } from '@/lib/shop-admin-api'

interface WebsiteStatusBannerProps {
  status: WebsiteStatusResponse | null
}

export function WebsiteStatusBanner({ status }: WebsiteStatusBannerProps) {
  if (!status || status.consecutive_failures < 2) return null

  return (
    <div className="rounded-lg px-4 py-3 text-sm bg-amber-50 border border-amber-200 flex gap-3 items-start">
      {/* Warning icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5 text-amber-500 mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>

      <div className="flex flex-col gap-0.5">
        <p className="font-medium text-amber-800">
          Website nicht erreichbar
        </p>
        <p className="text-amber-700">
          Deine Website{' '}
          <span className="font-mono break-all">{status.url}</span>{' '}
          ist nicht erreichbar ({status.consecutive_failures} mal in Folge). Bitte
          prüfe die URL in deinen Shop-Einstellungen.
        </p>
      </div>
    </div>
  )
}
