/**
 * SMTP mailer using nodemailer.
 *
 * Credentials are read from environment variables:
 *   SMOKETEST_SMTP_HOST     — SMTP server hostname
 *   SMOKETEST_SMTP_PORT     — SMTP port (default: 587)
 *   SMOKETEST_SMTP_USER     — SMTP auth username
 *   SMOKETEST_SMTP_PASSWORD — SMTP auth password
 *   SMOKETEST_MAIL_FROM     — Sender address (default: smoketester@pundo.cy)
 *   SMOKETEST_MAIL_TO       — Recipient address (required)
 *   SMOKETEST_DRY_RUN       — Set to "1" to skip sending and log payload
 *
 * Secrets are NEVER hardcoded — always read from process.env.
 */

import nodemailer from 'nodemailer'
import type { RunResult } from '../types.js'

export interface MailOptions {
  subject: string
  html: string
  text: string
  results: RunResult[]
}

export async function sendMail(opts: MailOptions): Promise<void> {
  const { subject, html, text, results } = opts

  const mailTo = process.env['SMOKETEST_MAIL_TO']
  if (!mailTo) {
    console.warn('[mailer] SMOKETEST_MAIL_TO not set — mail not sent')
    return
  }

  const isDryRun = process.env['SMOKETEST_DRY_RUN'] === '1'

  // Collect failed-screenshot attachments
  const attachments: { filename: string; content: Buffer; contentType: string }[] = []
  const failedWithScreenshots = results.filter(
    (r) => r.status === 'FAIL' && r.screenshot,
  )
  for (const r of failedWithScreenshots) {
    if (r.screenshot) {
      attachments.push({
        filename: `screenshot-${r.id.replace(/\//g, '-')}.png`,
        content: r.screenshot,
        contentType: 'image/png',
      })
    }
  }

  if (isDryRun) {
    console.log('[mailer] DRY_RUN mode — not sending mail')
    console.log('[mailer] Subject:', subject)
    console.log('[mailer] To:', mailTo)
    console.log('[mailer] Attachments:', attachments.length)
    console.log('[mailer] Body (first 500 chars):', text.slice(0, 500))
    return
  }

  // SMTP config from environment
  const host = process.env['SMOKETEST_SMTP_HOST']
  const port = parseInt(process.env['SMOKETEST_SMTP_PORT'] ?? '587', 10)
  const user = process.env['SMOKETEST_SMTP_USER']
  const password = process.env['SMOKETEST_SMTP_PASSWORD']
  const from = process.env['SMOKETEST_MAIL_FROM'] ?? 'smoketester@pundo.cy'

  if (!host || !user || !password) {
    console.warn('[mailer] SMTP credentials not set (SMOKETEST_SMTP_HOST, SMOKETEST_SMTP_USER, SMOKETEST_SMTP_PASSWORD) — mail not sent')
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // TLS for 465, STARTTLS for 587
    auth: {
      user,
      pass: password,
    },
    // Timeout: 15 seconds — don't block the runner indefinitely
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })

  try {
    const info = await transporter.sendMail({
      from: `"Pundo Smoketester" <${from}>`,
      to: mailTo,
      subject,
      text,
      html,
      attachments,
    })
    console.log(`[mailer] Mail sent: ${info.messageId}`)
  } catch (err) {
    console.error('[mailer] Failed to send mail:', err)
    // Don't throw — mail failure should not override the smoketest exit code
  }
}
