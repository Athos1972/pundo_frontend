/**
 * Unit tests for ProductPhotoUpload component
 *
 * Tests:
 * - Renders upload button and hint
 * - File size validation (> 5 MB) → inline error, no request
 * - File type validation (non-image) → inline error, no request
 * - Limit validation (already at 8 images)
 * - Remove committed image
 * - Reorder (move up / move down)
 * - Pending-mode (no productId) — queues locally
 * - Upload success in edit-mode → calls onChange with new image
 * - Upload error in edit-mode → shows error message
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ProductPhotoUpload } from '@/components/shop-admin/ProductPhotoUpload'
import type { AdminProductImage } from '@/types/shop-admin'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/image', () => ({
  default: ({ src, alt, fill: _fill, ...rest }: {
    src: string; alt: string; fill?: boolean; [key: string]: unknown
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...rest} />
  ),
}))

// Stub URL.createObjectURL / revokeObjectURL
const mockBlobUrl = 'blob:http://localhost/test-preview'
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn(() => mockBlobUrl),
  revokeObjectURL: vi.fn(),
})

// ─── Fixtures ────────────────────────────────────────────────────────────────

const IMAGES: AdminProductImage[] = [
  { id: 1, url: '/images/photo1.webp', sort_order: 0 },
  { id: 2, url: '/images/photo2.webp', sort_order: 1 },
  { id: 3, url: '/images/photo3.webp', sort_order: 2 },
]

function makeFile(name = 'photo.jpg', type = 'image/jpeg', sizeBytes = 100_000): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type })
  return new File([blob], name, { type })
}

function makeProps(overrides: Partial<React.ComponentProps<typeof ProductPhotoUpload>> = {}) {
  const onChange = vi.fn()
  const onPendingFilesChange = vi.fn()
  return {
    images: [],
    onChange,
    onPendingFilesChange,
    lang: 'en',
    ...overrides,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProductPhotoUpload — render', () => {
  it('renders upload button and label', () => {
    render(<ProductPhotoUpload {...makeProps()} />)
    expect(screen.getByText(/product photos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add photo/i })).toBeInTheDocument()
  })

  it('shows hint text', () => {
    render(<ProductPhotoUpload {...makeProps()} />)
    expect(screen.getByText(/jpeg, png, webp/i)).toBeInTheDocument()
  })

  it('shows counter 0/8 when no images', () => {
    render(<ProductPhotoUpload {...makeProps()} />)
    expect(screen.getByText('0/8')).toBeInTheDocument()
  })

  it('renders existing committed images as thumbnails', () => {
    render(<ProductPhotoUpload {...makeProps({ images: IMAGES })} />)
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(IMAGES.length)
  })

  it('hides add button when at max capacity (8 images)', () => {
    const maxImages: AdminProductImage[] = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      url: `/images/photo${i + 1}.webp`,
      sort_order: i,
    }))
    render(<ProductPhotoUpload {...makeProps({ images: maxImages })} />)
    expect(screen.queryByRole('button', { name: /add photo/i })).not.toBeInTheDocument()
  })
})

describe('ProductPhotoUpload — file validation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows size error for files > 5 MB and does not call fetch', async () => {
    render(<ProductPhotoUpload {...makeProps()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const bigFile = makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024)
    await act(async () => {
      fireEvent.change(input, { target: { files: [bigFile] } })
    })

    expect(screen.getByRole('alert')).toHaveTextContent(/too large/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows type error for non-image files (e.g. pdf) and does not call fetch', async () => {
    render(<ProductPhotoUpload {...makeProps()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const pdfFile = makeFile('doc.pdf', 'application/pdf', 1000)
    await act(async () => {
      fireEvent.change(input, { target: { files: [pdfFile] } })
    })

    expect(screen.getByRole('alert')).toHaveTextContent(/invalid file type/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows limit error when already at 8 images (via file input)', async () => {
    const maxImages: AdminProductImage[] = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      url: `/images/photo${i + 1}.webp`,
      sort_order: i,
    }))
    // Even if button is hidden, simulate direct input change
    const { container } = render(
      <ProductPhotoUpload {...makeProps({ images: maxImages })} />
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = makeFile('extra.jpg', 'image/jpeg', 100_000)
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    expect(screen.getByRole('alert')).toHaveTextContent(/maximum of 8/i)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('ProductPhotoUpload — pending mode (no productId)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queues file locally without calling fetch', async () => {
    const props = makeProps({ productId: undefined })
    render(<ProductPhotoUpload {...props} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const file = makeFile('photo.jpg', 'image/jpeg', 100_000)
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    expect(fetch).not.toHaveBeenCalled()
    // Pending file shown in UI
    expect(screen.getByText('photo.jpg')).toBeInTheDocument()
    // onPendingFilesChange notified
    expect(props.onPendingFilesChange).toHaveBeenCalledWith([file])
  })

  it('removes pending file on Remove click', async () => {
    const props = makeProps({ productId: undefined })
    render(<ProductPhotoUpload {...props} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const file = makeFile('photo.jpg', 'image/jpeg', 100_000)
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    // Find and click remove
    const removeBtn = screen.getAllByRole('button', { name: /remove photo/i })[0]
    await act(async () => {
      fireEvent.click(removeBtn)
    })

    expect(screen.queryByText('photo.jpg')).not.toBeInTheDocument()
    // onPendingFilesChange called with empty array
    expect(props.onPendingFilesChange).toHaveBeenLastCalledWith([])
  })
})

describe('ProductPhotoUpload — edit-mode upload', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => mockBlobUrl),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls fetch and invokes onChange with new image on success', async () => {
    const serverImage = { id: 99, url: '/images/new.webp', sort_order: 0 }
    mockFetch(201, serverImage)

    const props = makeProps({ productId: 42, images: [] })
    render(<ProductPhotoUpload {...props} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await act(async () => {
      fireEvent.change(input, { target: { files: [makeFile()] } })
    })

    await waitFor(() => {
      expect(props.onChange).toHaveBeenCalledWith([
        { id: 99, url: '/images/new.webp', sort_order: 0 },
      ])
    })
  })

  it('shows upload error message on fetch failure', async () => {
    mockFetch(500, { detail: 'internal error' })

    const props = makeProps({ productId: 42, images: [] })
    render(<ProductPhotoUpload {...props} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await act(async () => {
      fireEvent.change(input, { target: { files: [makeFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i)
    })
    expect(props.onChange).not.toHaveBeenCalled()
  })

  it('shows limit error message when backend returns 409 max_images_reached', async () => {
    mockFetch(409, { detail: 'max_images_reached' })

    const props = makeProps({ productId: 42, images: [] })
    render(<ProductPhotoUpload {...props} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await act(async () => {
      fireEvent.change(input, { target: { files: [makeFile()] } })
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/maximum of 8/i)
    })
  })
})

describe('ProductPhotoUpload — remove committed image', () => {
  it('calls onChange with image removed', () => {
    const props = makeProps({ images: IMAGES })
    render(<ProductPhotoUpload {...props} />)

    // Remove first image (index 0)
    const removeBtns = screen.getAllByRole('button', { name: /remove photo 1/i })
    fireEvent.click(removeBtns[0])

    expect(props.onChange).toHaveBeenCalledWith([
      { id: 2, url: '/images/photo2.webp', sort_order: 1 },
      { id: 3, url: '/images/photo3.webp', sort_order: 2 },
    ])
  })
})

describe('ProductPhotoUpload — reorder', () => {
  it('move down: first image swaps with second, sort_order normalized', () => {
    const props = makeProps({ images: IMAGES })
    render(<ProductPhotoUpload {...props} />)

    // Move-down button of first image
    const moveDownBtns = screen.getAllByRole('button', { name: /move down/i })
    fireEvent.click(moveDownBtns[0])

    expect(props.onChange).toHaveBeenCalledWith([
      { id: 2, url: '/images/photo2.webp', sort_order: 0 },
      { id: 1, url: '/images/photo1.webp', sort_order: 1 },
      { id: 3, url: '/images/photo3.webp', sort_order: 2 },
    ])
  })

  it('move up: last image swaps with second-to-last', () => {
    const props = makeProps({ images: IMAGES })
    render(<ProductPhotoUpload {...props} />)

    const moveUpBtns = screen.getAllByRole('button', { name: /move up/i })
    // Last item's move-up is the 3rd button
    fireEvent.click(moveUpBtns[2])

    expect(props.onChange).toHaveBeenCalledWith([
      { id: 1, url: '/images/photo1.webp', sort_order: 0 },
      { id: 3, url: '/images/photo3.webp', sort_order: 1 },
      { id: 2, url: '/images/photo2.webp', sort_order: 2 },
    ])
  })

  it('move up is disabled for the first item', () => {
    render(<ProductPhotoUpload {...makeProps({ images: IMAGES })} />)
    const moveUpBtns = screen.getAllByRole('button', { name: /move up/i })
    expect(moveUpBtns[0]).toBeDisabled()
  })

  it('move down is disabled for the last item', () => {
    render(<ProductPhotoUpload {...makeProps({ images: IMAGES })} />)
    const moveDownBtns = screen.getAllByRole('button', { name: /move down/i })
    expect(moveDownBtns[moveDownBtns.length - 1]).toBeDisabled()
  })
})
