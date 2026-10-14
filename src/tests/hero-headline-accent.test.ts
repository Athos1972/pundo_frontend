import { describe, it, expect } from 'vitest'
import { splitHeadlineAccent } from '@/components/layout/Hero'
import { t } from '@/lib/translations'
import { LANGS } from '@/lib/lang'

describe('splitHeadlineAccent', () => {
  it('highlights the accent inside the title instead of appending it', () => {
    expect(splitHeadlineAccent('Finde, was Zypern wirklich hat.', 'wirklich hat.')).toEqual({
      lead: 'Finde, was Zypern ',
      accent: 'wirklich hat',
      tail: '.',
    })
  })

  it('matches an accent in the middle of the title', () => {
    const r = splitHeadlineAccent('Найди, что на самом деле есть на Кипре.', 'на самом деле есть.')
    expect(r.lead + r.accent + r.tail).toBe('Найди, что на самом деле есть на Кипре.')
    expect(r.accent).toBe('на самом деле есть')
  })

  it('returns the plain title when the accent is missing or not contained', () => {
    expect(splitHeadlineAccent('Title.', undefined)).toEqual({ lead: 'Title.', accent: '', tail: '' })
    expect(splitHeadlineAccent('Title.', 'other.')).toEqual({ lead: 'Title.', accent: '', tail: '' })
  })

  it.each(LANGS)('never renders the accent twice (%s)', (lang) => {
    const tr = t(lang)
    for (const key of ['hero_title_pundo', 'hero_title_naidivse'] as const) {
      const title = tr[key] as string
      const r = splitHeadlineAccent(title, tr.homepage_headline_accent)
      expect(r.lead + r.accent + r.tail).toBe(title)
    }
  })
})
