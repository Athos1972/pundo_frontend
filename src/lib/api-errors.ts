/**
 * apiFetch (src/lib/api.ts) wirft `new Error("API <status>: <path>")`.
 * True, wenn das Backend mit 404 geantwortet hat (-> notFound() aufrufen,
 * damit kein Soft-404 mit HTTP 200 entsteht).
 */
export function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && /^API 404:/.test(err.message)
}
