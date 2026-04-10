import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-text mb-2" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>404</h1>
        <p className="text-text-muted mb-6">Diese Seite wurde nicht gefunden.</p>
        <Link href="/" className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors">
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
