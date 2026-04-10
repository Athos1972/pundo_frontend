'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

interface ConfirmDialogProps {
  open: boolean
  message: string
  confirmLabel: string
  cancelLabel: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  message,
  confirmLabel,
  cancelLabel,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg
              hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg
              hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
