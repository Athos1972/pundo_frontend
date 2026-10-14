import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'

// Admin-UI placeholder for F5910 Schnell-Onboarding domain management.
// Full CRUD implementation depends on backend endpoints being live
// (GET/POST/PATCH/DELETE /api/v1/admin/onboarding-domains).
// This page shows a holding screen until the backend is ready.

export default async function OnboardingDomainsPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.od_title}</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">{tr.od_backend_missing}</p>
        <p>{tr.od_intro}</p>
        {/* @i18n-allow-literal — API-Pfade, technisch */}
        <ul className="mt-2 list-disc list-inside space-y-1 font-mono text-xs">
          {/* @i18n-allow-literal */}
          <li>GET /api/v1/admin/onboarding-domains</li>
          {/* @i18n-allow-literal */}
          <li>POST /api/v1/admin/onboarding-domains</li>
          {/* @i18n-allow-literal */}
          <li>PATCH /api/v1/admin/onboarding-domains/{'{id}'}</li>
          {/* @i18n-allow-literal */}
          <li>DELETE /api/v1/admin/onboarding-domains/{'{id}'}</li>
        </ul>
      </div>

      <div className="text-sm text-gray-500">
        <p>
          {tr.od_fallback}{' '}
          {/* @i18n-allow-literal — Dateipfad */}
          <code className="bg-gray-100 px-1 rounded">src/lib/onboarding/domains.ts</code>.
        </p>
      </div>
    </div>
  )
}
