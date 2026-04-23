import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

// Wird vom deploy.sh nach jedem erfolgreichen Deploy aufgerufen, um den
// ISR-Cache der Sitemap zu invalidieren. Sitemap selbst hat
// `revalidate = false` und wird nie automatisch erneuert — nur ueber
// diesen Endpoint oder durch erneutes Builden.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  const provided = request.headers.get('x-revalidate-secret')
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  revalidatePath('/sitemap.xml')
  return NextResponse.json({ revalidated: true, path: '/sitemap.xml' })
}
