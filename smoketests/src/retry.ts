/**
 * Exponential backoff retry helper.
 *
 * Used to detect domain-unreachable conditions (DNS/TLS/network errors).
 * After maxRetries failures, the error is re-thrown for the caller to handle
 * (runner sets Exit-Code 2 in that case).
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  onRetry?: (attempt: number, error: unknown) => void
}

/**
 * Retry an async operation with exponential backoff.
 *
 * @param fn           - The operation to retry
 * @param options      - maxRetries (default 3), baseDelayMs (default 1000)
 * @returns            - Result of fn on success
 * @throws             - Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt) // 1s, 2s, 4s
        onRetry?.(attempt + 1, err)
        await sleep(delayMs)
      }
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Returns true if the error looks like a network/domain-unreachable error.
 * Used to distinguish "domain unreachable" (Exit-Code 2) from "test failed" (Exit-Code 1).
 */
export function isDomainUnreachableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes('net::err_') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('timeout') ||
    msg.includes('ssl') ||
    msg.includes('tls') ||
    msg.includes('certificate')
  )
}
