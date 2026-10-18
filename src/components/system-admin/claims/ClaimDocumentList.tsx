'use client'
// F5970 — proof documents of an application. The file is only fetched on request (a click loads an image, a link
// opens a PDF in a new tab): every view is an audit event on the server, so nothing loads just by opening the page.
// No <iframe> (the CSP has no frame-src for this). Only imports from src/components/ui/ and system-admin code.

import { useState } from 'react'
import type { SysAdminClaimDocument } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface Props {
  claimId: number
  documents: SysAdminClaimDocument[]
  documentsDeletedAt: string | null
  tr: SysAdminTranslations
}

const documentUrl = (claimId: number, docId: number) => `/api/admin/claim-requests/${claimId}/documents/${docId}`

export function ClaimDocumentList({ claimId, documents, documentsDeletedAt, tr }: Props) {
  const [shown, setShown] = useState<Set<number>>(new Set())
  const toggle = (id: number) =>
    setShown((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (documents.length === 0) return <p className="text-sm text-gray-400">{tr.claims_doc_none}</p>

  return (
    <div className="flex flex-col gap-3" data-testid="claim-documents">
      <ul className="flex flex-col gap-2">
        {documents.map((doc) => {
          const gone = doc.deleted_at !== null
          const isImage = doc.media_type.startsWith('image/')
          return (
            <li key={doc.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 text-sm" data-testid="claim-document">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 break-all font-medium text-gray-800" dir="auto">{doc.filename}</span>
                <span className="text-xs text-gray-500">
                  {`${Math.max(1, Math.round(doc.size_bytes / 1024))} KB · ${tr.claims_doc_views.replace('{n}', String(doc.view_count))}`}
                </span>
              </div>
              {gone ? (
                <p className="text-xs text-gray-400">{tr.claims_doc_deleted.replace('{date}', doc.deleted_at!.slice(0, 10))}</p>
              ) : isImage ? (
                <>
                  <button type="button" onClick={() => toggle(doc.id)} className="w-fit text-sm font-medium text-slate-800 underline" data-testid="claim-document-toggle">
                    {shown.has(doc.id) ? tr.claims_doc_hide : tr.claims_doc_show}
                  </button>
                  {shown.has(doc.id) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={documentUrl(claimId, doc.id)} alt={doc.filename} className="max-h-96 w-auto max-w-full rounded border border-gray-200" />
                  )}
                </>
              ) : (
                <a
                  href={documentUrl(claimId, doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit text-sm font-medium text-slate-800 underline"
                  data-testid="claim-document-open"
                >
                  {tr.claims_doc_open}
                </a>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-gray-400">{tr.claims_doc_hint}</p>
      {documentsDeletedAt && <p className="text-xs text-gray-500">{tr.claims_doc_all_deleted.replace('{date}', documentsDeletedAt.slice(0, 10))}</p>}
    </div>
  )
}
