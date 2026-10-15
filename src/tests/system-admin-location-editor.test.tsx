import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ─── LocationEditor ─────────────────────────────────────────────────────────────
// The leaflet map is loaded via next/dynamic; replace it with a probe that shows the
// position it receives and lets the test simulate a pin move.

vi.mock('next/dynamic', () => ({
  default: () => function MapProbe({ lat, lng, onMove }: { lat: number; lng: number; onMove: (a: number, b: number) => void }) {
    return (
      <div data-testid="map" data-lat={lat} data-lng={lng}>
        <button type="button" onClick={() => onMove(1.5, 2.5)}>move-pin</button>
      </div>
    )
  },
}))

import { LocationEditor } from '@/components/system-admin/LocationEditor'

const mockFetch = vi.fn()
const labels = { searchPlaceholder: 'Search address', noResultsLabel: 'Nothing found', latLabel: 'Latitude', lngLabel: 'Longitude' }

beforeEach(() => { mockFetch.mockReset(); vi.stubGlobal('fetch', mockFetch) })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('LocationEditor', () => {
  it('shows the given position, or a default when none is set', () => {
    const { rerender } = render(<LocationEditor lat={35.1} lng={33.4} onChange={vi.fn()} {...labels} />)
    expect(screen.getByTestId('map').getAttribute('data-lat')).toBe('35.1')
    expect((screen.getByLabelText('Latitude') as HTMLInputElement).value).toBe('35.1')
    rerender(<LocationEditor lat={null} lng={null} onChange={vi.fn()} {...labels} />)
    expect(screen.getByTestId('map').getAttribute('data-lat')).toBe('48.2083')   // default pin
    expect((screen.getByLabelText('Latitude') as HTMLInputElement).value).toBe('')    // but the inputs stay empty
  })

  it('pin moves are reported', async () => {
    const onChange = vi.fn()
    render(<LocationEditor lat={1} lng={2} onChange={onChange} {...labels} />)
    await userEvent.setup().click(screen.getByText('move-pin'))
    expect(onChange).toHaveBeenCalledWith(1.5, 2.5)
  })

  it('manual coordinate input updates one axis and keeps the other; invalid numbers are ignored', () => {
    const onChange = vi.fn()
    render(<LocationEditor lat={10} lng={20} onChange={onChange} {...labels} />)
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '11.5' } })
    expect(onChange).toHaveBeenLastCalledWith(11.5, 20)
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-3.25' } })
    expect(onChange).toHaveBeenLastCalledWith(10, -3.25)
    onChange.mockClear()
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('with only one axis missing the default fills in for the other', () => {
    const onChange = vi.fn()
    render(<LocationEditor lat={null} lng={null} onChange={onChange} {...labels} />)
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '33' } })
    expect(onChange).toHaveBeenLastCalledWith(48.2083, 33)
  })

  describe('address search', () => {
    it('ignores queries shorter than three characters', () => {
      vi.useFakeTimers()
      render(<LocationEditor lat={1} lng={2} onChange={vi.fn()} {...labels} />)
      fireEvent.change(screen.getByPlaceholderText('Search address'), { target: { value: 'ab' } })
      act(() => { vi.advanceTimersByTime(1000) })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('debounces: only the last keystroke triggers one encoded request', async () => {
      vi.useFakeTimers()
      mockFetch.mockResolvedValue({ json: async () => [] })
      render(<LocationEditor lat={1} lng={2} onChange={vi.fn()} {...labels} />)
      const input = screen.getByPlaceholderText('Search address')
      fireEvent.change(input, { target: { value: 'Ermou' } })
      act(() => { vi.advanceTimersByTime(200) })
      fireEvent.change(input, { target: { value: 'Ermou 12 & co' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(400) })
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch.mock.calls[0][0]).toBe('/api/nominatim?q=Ermou%2012%20%26%20co')
    })

    it('lists results and applies the chosen one (coordinates + readable name)', async () => {
      vi.useFakeTimers()
      const onChange = vi.fn()
      mockFetch.mockResolvedValue({ json: async () => [
        { place_id: 1, display_name: 'Ermou 1, Athens', lat: '37.97', lon: '23.72' },
        { place_id: 2, display_name: 'Ermou 2, Athens', lat: '37.98', lon: '23.73' },
      ] })
      render(<LocationEditor lat={1} lng={2} onChange={onChange} {...labels} />)
      fireEvent.change(screen.getByPlaceholderText('Search address'), { target: { value: 'Ermou' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(400) })
      fireEvent.click(screen.getByRole('button', { name: 'Ermou 2, Athens' }))
      expect(onChange).toHaveBeenCalledWith(37.98, 23.73)
      expect((screen.getByPlaceholderText('Search address') as HTMLInputElement).value).toBe('Ermou 2, Athens')
      expect(screen.queryByRole('button', { name: 'Ermou 1, Athens' })).toBeNull()
    })

    it('says so when nothing was found', async () => {
      vi.useFakeTimers()
      mockFetch.mockResolvedValue({ json: async () => [] })
      render(<LocationEditor lat={1} lng={2} onChange={vi.fn()} {...labels} />)
      fireEvent.change(screen.getByPlaceholderText('Search address'), { target: { value: 'zzzz' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(400) })
      expect(screen.getByText('Nothing found')).toBeTruthy()
    })

    it('a failing search shows no list and does not break the editor', async () => {
      vi.useFakeTimers()
      mockFetch.mockRejectedValue(new Error('down'))
      render(<LocationEditor lat={1} lng={2} onChange={vi.fn()} {...labels} />)
      fireEvent.change(screen.getByPlaceholderText('Search address'), { target: { value: 'Ermou' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(400) })
      expect(screen.queryByRole('list')).toBeNull()
      expect(screen.queryByText('…')).toBeNull()
    })

    it('shortening the query hides previous results', async () => {
      vi.useFakeTimers()
      mockFetch.mockResolvedValue({ json: async () => [{ place_id: 1, display_name: 'Hit', lat: '1', lon: '2' }] })
      render(<LocationEditor lat={1} lng={2} onChange={vi.fn()} {...labels} />)
      const input = screen.getByPlaceholderText('Search address')
      fireEvent.change(input, { target: { value: 'Ermou' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(400) })
      expect(screen.getByText('Hit')).toBeTruthy()
      fireEvent.change(input, { target: { value: 'Er' } })
      expect(screen.queryByText('Hit')).toBeNull()
    })
  })
})

// ─── LocationEditorMap ──────────────────────────────────────────────────────────

const mapState = vi.hoisted(() => ({
  clickHandler: null as null | ((e: { latlng: { lat: number; lng: number } }) => void),
  dragend: null as null | (() => void),
  markerPos: { lat: 7, lng: 8 },
  setView: vi.fn(),
  getZoom: vi.fn(() => 14),
}))

vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('leaflet', () => ({ default: { icon: (o: unknown) => o } }))
vi.mock('react-leaflet', async () => {
  const R = await import('react')
  return {
    MapContainer: ({ children, center }: { children: React.ReactNode; center: [number, number] }) =>
      R.createElement('div', { 'data-testid': 'leaflet', 'data-center': center.join(',') }, children),
    TileLayer: () => null,
    Marker: R.forwardRef(function Marker(props: { eventHandlers: { dragend: () => void }; position: [number, number] }, ref: React.Ref<unknown>) {
      R.useImperativeHandle(ref, () => ({ getLatLng: () => mapState.markerPos }))
      mapState.dragend = props.eventHandlers.dragend
      return R.createElement('div', { 'data-testid': 'marker', 'data-pos': props.position.join(',') })
    }),
    useMapEvents: (handlers: { click?: typeof mapState.clickHandler }) => {
      if (handlers.click) mapState.clickHandler = handlers.click
      return { setView: mapState.setView, getZoom: mapState.getZoom }
    },
  }
})

import { LocationEditorMap } from '@/components/system-admin/LocationEditorMap'

describe('LocationEditorMap', () => {
  beforeEach(() => { mapState.setView.mockReset() })

  it('puts the marker at the given position', () => {
    render(<LocationEditorMap lat={34.9} lng={33.6} onMove={vi.fn()} />)
    expect(screen.getByTestId('marker').getAttribute('data-pos')).toBe('34.9,33.6')
  })

  it('clicking the map moves the pin', () => {
    const onMove = vi.fn()
    render(<LocationEditorMap lat={1} lng={2} onMove={onMove} />)
    mapState.clickHandler!({ latlng: { lat: 3.5, lng: 4.5 } })
    expect(onMove).toHaveBeenCalledWith(3.5, 4.5)
  })

  it('dragging the marker reports its final position', () => {
    const onMove = vi.fn()
    render(<LocationEditorMap lat={1} lng={2} onMove={onMove} />)
    mapState.dragend!()
    expect(onMove).toHaveBeenCalledWith(7, 8)
  })

  it('re-centers only when the position really changed (keeps the zoom)', () => {
    const { rerender } = render(<LocationEditorMap lat={1} lng={2} onMove={vi.fn()} />)
    expect(mapState.setView).not.toHaveBeenCalled()
    rerender(<LocationEditorMap lat={1} lng={2} onMove={vi.fn()} />)
    expect(mapState.setView).not.toHaveBeenCalled()
    rerender(<LocationEditorMap lat={5} lng={6} onMove={vi.fn()} />)
    expect(mapState.setView).toHaveBeenCalledWith([5, 6], 14)
  })
})
