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
        <h1 className="text-xl font-semibold text-gray-900">Onboarding Domains</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Backend-Endpoints noch nicht verfügbar</p>
        <p>
          Diese Seite verwaltet die kuratierten Domänen- und Spezialitäten-Listen für das
          Schnell-Onboarding (F5910). Sie wird aktiviert, sobald folgende Backend-Endpoints
          implementiert sind:
        </p>
        <ul className="mt-2 list-disc list-inside space-y-1 font-mono text-xs">
          <li>GET /api/v1/admin/onboarding-domains</li>
          <li>POST /api/v1/admin/onboarding-domains</li>
          <li>PATCH /api/v1/admin/onboarding-domains/{'{id}'}</li>
          <li>DELETE /api/v1/admin/onboarding-domains/{'{id}'}</li>
        </ul>
      </div>

      <div className="text-sm text-gray-500">
        <p>
          Bis dahin verwendet der Onboarding-Wizard eine statische Fallback-Liste
          (definiert in <code className="bg-gray-100 px-1 rounded">src/lib/onboarding/domains.ts</code>).
        </p>
      </div>
    </div>
  )
}
