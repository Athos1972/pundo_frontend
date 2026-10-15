import { describe, it, expect, vi } from 'vitest'
import React from 'react'

const headersMock = vi.fn(async () => new Headers())
vi.mock('next/headers', () => ({ headers: () => headersMock() }))
vi.mock('next/font/google', () => ({ DM_Sans: () => ({ variable: 'font-dm', className: 'font-dm' }) }))
vi.mock('@/app/globals.css', () => ({}))

describe('system-admin root layout', () => {
  it('reads request headers (opt-in to dynamic rendering so the CSP nonce applies) and is noindex', async () => {
    headersMock.mockClear()
    const mod = await import('@/app/(system-admin)/layout')
    const tree = await mod.default({ children: React.createElement('main', null, 'x') }) as React.ReactElement<{ lang: string; dir: string }>
    expect(headersMock).toHaveBeenCalledTimes(1)
    expect(tree.props.lang).toBe('en')
    expect(tree.props.dir).toBe('ltr')
    expect(mod.metadata.robots).toEqual({ index: false, follow: false })
  })
})
