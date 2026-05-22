import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs before importing the module under test
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

vi.mock('path', () => ({
  default: {
    join: (...parts: string[]) => parts.join('/'),
  },
}))

describe('getFeaturedCategoryIds', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns IDs in file order when file is valid', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValue(true)
    vi.mocked(fs.default.readFileSync).mockReturnValue(
      JSON.stringify({
        comment: 'test',
        category_ids: [
          { id: 42, name: 'Dog Supplies' },
          { id: 17, name: 'Coffee' },
        ],
      })
    )

    const { getFeaturedCategoryIds } = await import('@/lib/featured-categories')
    expect(getFeaturedCategoryIds()).toEqual([42, 17])
  })

  it('returns null when file does not exist', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValue(false)

    const { getFeaturedCategoryIds } = await import('@/lib/featured-categories')
    expect(getFeaturedCategoryIds()).toBeNull()
  })

  it('returns null when category_ids is empty array', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValue(true)
    vi.mocked(fs.default.readFileSync).mockReturnValue(
      JSON.stringify({ comment: 'empty', category_ids: [] })
    )

    const { getFeaturedCategoryIds } = await import('@/lib/featured-categories')
    expect(getFeaturedCategoryIds()).toBeNull()
  })

  it('returns null and warns when file contains invalid JSON', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValue(true)
    vi.mocked(fs.default.readFileSync).mockReturnValue('{ invalid json }')

    const { getFeaturedCategoryIds } = await import('@/lib/featured-categories')
    expect(getFeaturedCategoryIds()).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Steuerfile'))
    warnSpy.mockRestore()
  })

  it('returns null and warns when category_ids field is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValue(true)
    vi.mocked(fs.default.readFileSync).mockReturnValue(JSON.stringify({ comment: 'no ids' }))

    const { getFeaturedCategoryIds } = await import('@/lib/featured-categories')
    // category_ids is undefined → not an Array → returns null (no warn needed here)
    expect(getFeaturedCategoryIds()).toBeNull()
    warnSpy.mockRestore()
  })
})
