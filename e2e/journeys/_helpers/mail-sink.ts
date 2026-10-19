/**
 * Mail-Sink-Helfer (B8950-016 T29/T31): liest, was die Testinstanz verschickt hat.
 *
 * `start_test_server.sh` (Backend-Repo) startet `scripts/mail_sink.py` (aiosmtpd, Port 1025) und setzt SMTP_HOST darauf;
 * jede Mail landet als `.eml` in `<Backend-Repo>/.mail-sink/`. Der Helfer wartet auf die Mail an eine Adresse und
 * parst sie mit dem Python des Backend-Repos (Standard-Bibliothek `email`, korrekte MIME-/Charset-Behandlung),
 * statt MIME in TypeScript nachzubauen.
 */
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect } from '@playwright/test'

const BACKEND_REPO = process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'
const SINK_DIR = process.env.MAIL_SINK_DIR ?? path.join(BACKEND_REPO, '.mail-sink')

export interface SinkMail {
  file: string
  subject: string
  from: string
  to: string
  listUnsubscribe: string | null
  text: string | null
  html: string | null
  /** Alle `<img src>` des HTML-Teils. */
  imageUrls: string[]
}

const PARSE = `
import email, json, re, sys
from email import policy
m = email.message_from_bytes(open(sys.argv[1], "rb").read(), policy=policy.default)
def body(kind):
    p = m.get_body(preferencelist=(kind,))
    return p.get_content() if p is not None else None
html = body("html")
print(json.dumps({
    "subject": str(m["Subject"] or ""), "from": str(m["From"] or ""), "to": str(m["To"] or ""),
    "listUnsubscribe": str(m["List-Unsubscribe"]) if m["List-Unsubscribe"] else None,
    "text": body("plain"), "html": html,
    "imageUrls": re.findall(r"<img[^>]+src=[\\"']([^\\"']+)[\\"']", html or ""),
}))
`

function parse(file: string): SinkMail {
  const python = path.join(BACKEND_REPO, '.venv', 'bin', 'python')
  const out = execFileSync(python, ['-I', '-c', PARSE, file], { encoding: 'utf8' })
  return { file, ...(JSON.parse(out) as Omit<SinkMail, 'file'>) }
}

/** Alle `.eml`-Dateien an `address`, neueste zuletzt (Dateiname enthaelt Zeitstempel und Empfaenger). */
export function mailsTo(address: string): string[] {
  if (!fs.existsSync(SINK_DIR)) return []
  const tag = address.toLowerCase().replace(/[^a-z0-9@._-]/g, '_')
  return fs.readdirSync(SINK_DIR)
    .filter((f) => f.toLowerCase().endsWith(`__${tag}.eml`))
    .sort()
    .map((f) => path.join(SINK_DIR, f))
}

/** Wartet, bis eine Mail an `address` eintrifft (Standard 15 s) und liefert die neueste; rot statt still. */
export async function waitForMail(address: string, timeoutMs = 15_000): Promise<SinkMail> {
  await expect.poll(() => mailsTo(address).length, {
    message: `keine Mail an ${address} im Mail-Sink (${SINK_DIR}); laeuft die Testinstanz ueber start_test_server.sh?`,
    timeout: timeoutMs,
  }).toBeGreaterThan(0)
  const files = mailsTo(address)
  return parse(files[files.length - 1])
}
