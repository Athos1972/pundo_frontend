/**
 * Dev-only helper: retrieve email_verification_token from the test DB.
 *
 * Uses the same execSync + Python pattern as shop-owner-full-lifecycle.spec.ts
 * (see adminLogin() in that file for the reference implementation).
 *
 * The backend does not expose a dev endpoint for tokens. Instead we query
 * the `shop_owners` table directly via SQLAlchemy (Option A from architecture).
 *
 * Polling (3 retries, 300ms apart) handles the race condition between the
 * POST /api/v1/shop-owner/register API response and the DB write being visible.
 *
 * Throws if the token is null after all retries — callers must not silently skip.
 */

import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const BACKEND_REPO =
  process.env.BACKEND_REPO ?? '/Users/bb_studio_2025/dev/github/pundo_main_backend'

function getTestDbUrl(): string {
  let testDbUrl = process.env.DATABASE_URL_TEST
  if (!testDbUrl) {
    try {
      const envFile = fs.readFileSync(path.join(BACKEND_REPO, '.env'), 'utf8')
      const match = envFile.match(/^DATABASE_URL_TEST=(.+)$/m)
      if (match) testDbUrl = match[1].trim()
    } catch { /* ignore */ }
  }
  if (!testDbUrl) {
    throw new Error(
      'DATABASE_URL_TEST not set and could not be read from backend .env. ' +
      'Set the env var or ensure BACKEND_REPO points to the backend repo.'
    )
  }
  return testDbUrl
}

/**
 * Fetch the email_verification_token for `email` from the test DB.
 * Retries 3 times with 300ms pause to handle register→DB-write race conditions.
 *
 * Writes the Python script to a temp file (avoids shell quoting issues with
 * multi-line scripts and special characters in the DB URL / email).
 *
 * @throws Error if token is null/empty after all retries (setup is broken).
 */
export async function getVerificationToken(email: string): Promise<string> {
  const pyBin = `${BACKEND_REPO}/.venv/bin/python`
  const dbUrl = getTestDbUrl()

  // Write a real Python file to avoid shell quoting / newline escaping issues.
  // This follows the same pattern as seed_admin.py calls in shop-owner-full-lifecycle.spec.ts.
  const tmpFile = path.join(os.tmpdir(), `pundo-dev-token-${Date.now()}.py`)
  const pythonScript = [
    'import sys',
    'from sqlalchemy import create_engine, text',
    `engine = create_engine(${JSON.stringify(dbUrl)})`,
    'with engine.connect() as conn:',
    '    row = conn.execute(',
    `        text("SELECT email_verification_token FROM shop_owners WHERE email = :email"),`,
    `        {"email": ${JSON.stringify(email)}}`,
    '    ).fetchone()',
    '    if row and row[0]:',
    '        print(row[0])',
    '    else:',
    '        print("")',
  ].join('\n')

  fs.writeFileSync(tmpFile, pythonScript, 'utf8')

  const maxRetries = 3
  const retryDelayMs = 300

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      }
      try {
        const result = execSync(`${pyBin} ${tmpFile}`, {
          cwd: BACKEND_REPO,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, DATABASE_URL: dbUrl },
        })
          .toString()
          .trim()

        if (result && result.length > 0) {
          return result
        }
        console.warn(
          `[dev-token] Attempt ${attempt}/${maxRetries}: token for ${email} is null/empty`
        )
      } catch (err) {
        console.warn(`[dev-token] Attempt ${attempt}/${maxRetries}: python query failed:`, err)
      }
    }
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile) } catch { /* ignore */ }
  }

  throw new Error(
    `SETUP BROKEN: email_verification_token for ${email} is null after ${maxRetries} retries. ` +
    'Did the registration call succeed? Is DATABASE_URL_TEST reachable?'
  )
}
