'use client'
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-text mb-2 font-heading">Etwas ist schiefgelaufen</h1>
        <button onClick={reset} className="mt-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors">
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}
