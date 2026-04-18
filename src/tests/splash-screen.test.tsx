import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { SplashScreen } from '@/components/ui/SplashScreen'

// sessionStorage mock
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true })

describe('SplashScreen', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt das splashSvg-Bild wenn noch kein app_splash-Key gesetzt', async () => {
    const { container } = render(<SplashScreen splashSvg="/brands/pundo/splash-outro.svg" />)
    await act(async () => { vi.advanceTimersByTime(10) })
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/brands/pundo/splash-outro.svg')
  })

  it('zeigt rusky-Splash wenn rusky-Brand-Pfad übergeben', async () => {
    const { container } = render(<SplashScreen splashSvg="/brands/rusky/splash-outro.svg" />)
    await act(async () => { vi.advanceTimersByTime(10) })
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/brands/rusky/splash-outro.svg')
  })

  it('setzt app_splash in sessionStorage nach Anzeige', async () => {
    render(<SplashScreen splashSvg="/brands/pundo/splash-outro.svg" />)
    await act(async () => { vi.advanceTimersByTime(10) })
    expect(sessionStorageMock.getItem('app_splash')).toBe('1')
  })

  it('zeigt keinen Splash wenn app_splash bereits gesetzt', async () => {
    sessionStorageMock.setItem('app_splash', '1')
    const { container } = render(<SplashScreen splashSvg="/brands/pundo/splash-outro.svg" />)
    await act(async () => { vi.advanceTimersByTime(10) })
    expect(container.querySelector('img')).toBeNull()
  })

  it('img hat alt=""', async () => {
    const { container } = render(<SplashScreen splashSvg="/brands/pundo/splash-outro.svg" />)
    await act(async () => { vi.advanceTimersByTime(10) })
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('')
  })
})
