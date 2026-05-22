import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Lang } from '@/lib/lang'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

const mockGetLangServer = vi.fn<() => Promise<Lang>>()
vi.mock('@/lib/lang', () => ({
  getLangServer: () => mockGetLangServer(),
  RTL_LANGS: new Set(['ar', 'he']),
  DEFAULT_LANG: 'en',
  LANGS: ['en', 'de', 'ru', 'el', 'ar', 'he'],
  isRTL: (lang: string) => lang === 'ar' || lang === 'he',
}))

vi.mock('@/lib/routing', () => ({
  localePath: (lang: string, path: string) => `/${lang}${path}`,
}))

describe('NotFound 404 Page', () => {
  beforeEach(() => {
    mockGetLangServer.mockReset()
  })

  it('EN: zeigt englischen Text, LTR-dir und Link auf /en/', async () => {
    mockGetLangServer.mockResolvedValue('en')
    const { default: NotFound } = await import('@/app/(customer)/not-found')
    const { container } = render(await NotFound())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404')
    expect(screen.getByText('This page could not be found.')).toBeTruthy()
    expect(screen.getByRole('link')).toHaveTextContent('Back to Home')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/')
    expect(container.firstChild).toHaveAttribute('dir', 'ltr')
  })

  it('DE: zeigt deutschen Text und Link auf /de/', async () => {
    mockGetLangServer.mockResolvedValue('de')
    const { default: NotFound } = await import('@/app/(customer)/not-found')
    const { container } = render(await NotFound())
    expect(screen.getByText('Diese Seite wurde nicht gefunden.')).toBeTruthy()
    expect(screen.getByRole('link')).toHaveTextContent('Zur Startseite')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/de/')
    expect(container.firstChild).toHaveAttribute('dir', 'ltr')
  })

  it('AR: setzt dir=rtl und zeigt arabischen Text', async () => {
    mockGetLangServer.mockResolvedValue('ar')
    const { default: NotFound } = await import('@/app/(customer)/not-found')
    const { container } = render(await NotFound())
    expect(container.firstChild).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('لم يتم العثور على هذه الصفحة.')).toBeTruthy()
    expect(screen.getByRole('link')).toHaveTextContent('إلى الرئيسية')
  })

  it('HE: setzt dir=rtl und zeigt hebräischen Text', async () => {
    mockGetLangServer.mockResolvedValue('he')
    const { default: NotFound } = await import('@/app/(customer)/not-found')
    const { container } = render(await NotFound())
    expect(container.firstChild).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('הדף לא נמצא.')).toBeTruthy()
    expect(screen.getByRole('link')).toHaveTextContent('לדף הבית')
  })

  it('EL: setzt dir=ltr und zeigt griechischen Text', async () => {
    mockGetLangServer.mockResolvedValue('el')
    const { default: NotFound } = await import('@/app/(customer)/not-found')
    const { container } = render(await NotFound())
    expect(container.firstChild).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('Αυτή η σελίδα δεν βρέθηκε.')).toBeTruthy()
  })

  it('RU: setzt dir=ltr und zeigt russischen Text', async () => {
    mockGetLangServer.mockResolvedValue('ru')
    const { default: NotFound } = await import('@/app/(customer)/not-found')
    const { container } = render(await NotFound())
    expect(container.firstChild).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('Страница не найдена.')).toBeTruthy()
  })
})
