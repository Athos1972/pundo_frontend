import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const SIGNUP_FILE = path.join(process.cwd(), 'data', 'naidivse-signups.txt')

export async function POST(req: NextRequest) {
  let email: string
  try {
    const body = await req.json()
    email = String(body?.email ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  try {
    await fs.mkdir(path.dirname(SIGNUP_FILE), { recursive: true })
    await fs.appendFile(SIGNUP_FILE, email + '\n', 'utf8')
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
