/**
 * Parse a page range string like "1-3, 5, 7-9" into 0-based page indices.
 * @param input - User-facing 1-based page range string
 * @param totalPages - Total pages in the document
 * @returns Sorted unique 0-based indices
 */
export function parsePageRange(input: string, totalPages: number): number[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  const indices = new Set<number>()

  for (const part of trimmed.split(',')) {
    const segment = part.trim()
    if (!segment) continue

    if (segment.includes('-')) {
      const [startStr, endStr] = segment.split('-').map((s) => s.trim())
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error(`Invalid range: "${segment}"`)
      }
      if (start < 1 || end < 1 || start > end) {
        throw new Error(`Invalid range: "${segment}"`)
      }
      for (let p = start; p <= end; p++) {
        if (p > totalPages) {
          throw new Error(`Page ${p} is out of range (document has ${totalPages} pages)`)
        }
        indices.add(p - 1)
      }
    } else {
      const page = parseInt(segment, 10)
      if (Number.isNaN(page) || page < 1) {
        throw new Error(`Invalid page: "${segment}"`)
      }
      if (page > totalPages) {
        throw new Error(`Page ${page} is out of range (document has ${totalPages} pages)`)
      }
      indices.add(page - 1)
    }
  }

  return [...indices].sort((a, b) => a - b)
}
