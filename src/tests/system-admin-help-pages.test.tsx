// F8960 AK 1-6, 10 (unit level): help components and pages
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import React from 'react'
import { tSysAdmin } from '@/lib/system-admin-translations'

const { pathnameRef, topicOverride } = vi.hoisted(() => ({
  pathnameRef: { value: '/admin/dashboard' },
  topicOverride: { value: undefined as undefined | Record<string, unknown> },
}))

class NotFoundError extends Error { constructor() { super('NEXT_NOT_FOUND') } }
class RedirectError extends Error { constructor(public to: string) { super('NEXT_REDIRECT') } }
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => pathnameRef.value,
  notFound: () => { throw new NotFoundError() },
  redirect: (to: string) => { throw new RedirectError(to) },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/lib/lang', async (orig) => ({ ...(await orig<typeof import('@/lib/lang')>()), getLangServer: vi.fn(async () => 'en') }))
vi.mock('@/lib/system-admin-session', () => ({ requireAdminSession: vi.fn(async () => ({ email: 'a@b.c' })) }))
// Allow a synthetic videoId for one topic (no real video exists yet).
vi.mock('@/lib/system-admin-help', async (orig) => {
  const real = await orig<typeof import('@/lib/system-admin-help')>()
  return {
    ...real,
    HELP_TOPICS: new Proxy(real.HELP_TOPICS, {}),
    getHelpTopic: (id: string) => {
      const t = real.getHelpTopic(id)
      return t && topicOverride.value ? { ...t, ...topicOverride.value } : t
    },
  }
})

import { getLangServer } from '@/lib/lang'
import { requireAdminSession } from '@/lib/system-admin-session'
import { HELP_TOPICS, type HelpTopic } from '@/lib/system-admin-help'
import { HELP_CONTENT } from '@/lib/system-admin-help-content'
import { HelpVideoButton } from '@/components/system-admin/help/HelpVideoButton'
import { HelpTopicCard } from '@/components/system-admin/help/HelpTopicCard'
import { HelpSop } from '@/components/system-admin/help/HelpSop'
import { SysAdminNav } from '@/components/system-admin/AdminNav'
import ListPage from '@/app/(system-admin)/admin/(portal)/help/page'
import TopicPage from '@/app/(system-admin)/admin/(portal)/help/[topic]/page'

const en = tSysAdmin('en')
const el = tSysAdmin('el')
const VID = 'abcDEF12345'
const synthetic: HelpTopic = { ...HELP_TOPICS[0], videoId: VID, durationSec: 185 }

type Page = (props: never) => Promise<React.ReactElement>
const show = async (P: unknown, props: unknown = {}) => render(await (P as Page)(props as never))
const par = (topic: string) => ({ params: Promise.resolve({ topic }) })

beforeEach(() => {
  topicOverride.value = undefined
  vi.mocked(getLangServer).mockResolvedValue('en')
  vi.mocked(requireAdminSession).mockClear()
})

describe('HelpVideoButton', () => {
  it('with a videoId: new-tab link to YouTube with noopener noreferrer', () => {
    render(<HelpVideoButton videoId={VID} tr={en} />)
    const a = screen.getByRole('link')
    expect(a.getAttribute('href')).toBe(`https://www.youtube.com/watch?v=${VID}`)
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toContain('noopener')
    expect(a.getAttribute('rel')).toContain('noreferrer')
    expect(a.textContent).toContain(en.help_watch_video)
    expect(a.textContent).toContain(en.help_new_tab_hint)
  })

  it('without a videoId: no link at all, only the hint', () => {
    const { container } = render(<HelpVideoButton tr={en} />)
    expect(container.querySelectorAll('a').length).toBe(0)
    expect(screen.getByText(en.help_video_coming_soon)).toBeTruthy()
  })
})

describe('HelpTopicCard', () => {
  it('shows the title, one-liner and the "coming soon" badge without a video', () => {
    const c = HELP_CONTENT['admin-tour'].en
    const noVideo = { ...HELP_TOPICS[0], videoId: undefined, durationSec: undefined }
    const { container } = render(<HelpTopicCard topic={noVideo} content={c} tr={en} />)
    expect(screen.getByText(c.title)).toBeTruthy()
    expect(screen.getByText(c.summary)).toBeTruthy()
    expect(screen.getByTestId('help-topic-badge').textContent).toBe(en.help_video_coming_soon)
    expect(container.querySelectorAll('a[href*="youtube.com"]').length).toBe(0)
    expect(container.querySelector('a')!.getAttribute('href')).toBe('/admin/help/admin-tour')
  })

  it('shows the "Video" badge and the duration with a video', () => {
    render(<HelpTopicCard topic={synthetic} content={HELP_CONTENT['admin-tour'].el} tr={el} />)
    expect(screen.getByTestId('help-topic-badge').textContent).toBe(el.help_badge_video)
    expect(screen.getByText(el.help_duration.replace('{t}', '3:05'))).toBeTruthy()
  })
})

describe('HelpTopicCard (written guide without video)', () => {
  it('noVideo: no video badge and no "coming soon", the link still opens the topic', () => {
    const topic = HELP_TOPICS.find((t) => t.noVideo)!
    const c = HELP_CONTENT[topic.id].en
    const { container } = render(<HelpTopicCard topic={topic} content={c} tr={en} />)
    expect(screen.getByText(c.title)).toBeTruthy()
    expect(screen.queryByTestId('help-topic-badge')).toBeNull()
    expect(container.textContent).not.toContain(en.help_video_coming_soon)
    expect(container.textContent).not.toContain(en.help_badge_video)
    expect(container.querySelector('a')!.getAttribute('href')).toBe(`/admin/help/${topic.id}`)
  })
})

describe('HelpSop', () => {
  it('renders one list item per step and a labelled note per note', () => {
    const c = HELP_CONTENT.shops.en
    render(<HelpSop content={c} tr={en} />)
    expect(screen.getAllByRole('listitem').length).toBe(c.steps.length)
    const notes = screen.getAllByRole('note')
    expect(notes.length).toBe(c.notes!.length)
    expect(within(notes[0]).getByText(en.help_warning_label)).toBeTruthy()
  })

  it('works without notes', () => {
    render(<HelpSop content={{ title: 't', summary: 's', steps: ['one'] }} tr={en} />)
    expect(screen.getAllByRole('listitem').length).toBe(1)
    expect(screen.queryAllByRole('note').length).toBe(0)
  })
})

describe('help list page', () => {
  it('checks the session first, shows one card per topic in order, one h1, EN texts', async () => {
    await show(ListPage)
    expect(requireAdminSession).toHaveBeenCalledTimes(1)
    const cards = screen.getAllByTestId('help-topic-card')
    expect(cards.map((c) => c.getAttribute('data-topic'))).toEqual(HELP_TOPICS.map((t) => t.id))
    expect(screen.getAllByRole('heading', { level: 1 }).length).toBe(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en.help_title)
    // "coming soon" only for topics that still await a video; written guides (noVideo) show no badge at all
    expect(screen.queryAllByText(en.help_video_coming_soon).length).toBe(HELP_TOPICS.filter((t) => !t.videoId && !t.noVideo).length)
    expect(screen.getAllByTestId('help-topic-badge').length).toBe(HELP_TOPICS.filter((t) => !t.noVideo).length)
    HELP_TOPICS.forEach((t) => expect(screen.getByText(HELP_CONTENT[t.id].en.title)).toBeTruthy())
  })

  it('renders Greek without any English title', async () => {
    vi.mocked(getLangServer).mockResolvedValue('el')
    const { container } = await show(ListPage)
    HELP_TOPICS.forEach((t) => {
      expect(screen.getByText(HELP_CONTENT[t.id].el.title)).toBeTruthy()
      expect(container.textContent).not.toContain(HELP_CONTENT[t.id].en.summary)
    })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(el.help_title)
    expect(container.firstElementChild!.getAttribute('lang')).toBe('el')
  })

  it('does not render when the session check redirects', async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new RedirectError('/admin/login'))
    await expect((ListPage as unknown as Page)({} as never)).rejects.toMatchObject({ to: '/admin/login' })
  })
})

describe('help topic page', () => {
  it('unknown topic -> notFound, known session check first', async () => {
    await expect((TopicPage as unknown as Page)(par('nope') as never)).rejects.toBeInstanceOf(NotFoundError)
    expect(requireAdminSession).toHaveBeenCalled()
  })

  it('does not look at the topic when the session check redirects', async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new RedirectError('/admin/login'))
    await expect((TopicPage as unknown as Page)(par('crm') as never)).rejects.toMatchObject({ to: '/admin/login' })
  })

  it.each(HELP_TOPICS.map((t) => t.id))('%s: one h1, all steps, all admin links, video link only with a videoId', async (id) => {
    const topic = HELP_TOPICS.find((t) => t.id === id)!
    const { container } = await show(TopicPage, par(id))
    const c = HELP_CONTENT[id].en
    expect(screen.getAllByRole('heading', { level: 1 }).length).toBe(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(c.title)
    expect(container.querySelectorAll('ol > li').length).toBe(c.steps.length)
    const links = screen.getAllByTestId('help-admin-link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(topic.adminLinks.map((l) => l.href))
    links.forEach((a, i) => expect(a.textContent).toContain(`${en.help_open_in_admin}: ${en[topic.adminLinks[i].navKey]}`))
    if (topic.videoId) {
      expect(screen.getByTestId('help-video-link').getAttribute('href')).toBe(`https://www.youtube.com/watch?v=${topic.videoId}`)
      expect(screen.getByText(en.help_subtitles_hint)).toBeTruthy()
      expect(screen.queryByText(en.help_video_coming_soon)).toBeNull()
    } else if (topic.noVideo) {
      // written guide by decision: no video button, no "coming soon", no subtitle hint
      expect(container.querySelectorAll('a[href*="youtube.com"]').length).toBe(0)
      expect(screen.queryByTestId('help-video-soon')).toBeNull()
      expect(screen.queryByTestId('help-video-link')).toBeNull()
      expect(container.textContent).not.toContain(en.help_video_coming_soon)
      expect(container.textContent).not.toContain(en.help_subtitles_hint)
    } else {
      expect(container.querySelectorAll('a[href*="youtube.com"]').length).toBe(0)
      expect(screen.getByText(en.help_video_coming_soon)).toBeTruthy()
      expect(container.textContent).not.toContain(en.help_subtitles_hint)
    }
  })

  it('with a video: link out plus the subtitle hint', async () => {
    topicOverride.value = { videoId: VID, durationSec: 185 }
    await show(TopicPage, par('crm'))
    expect(screen.getByTestId('help-video-link').getAttribute('href')).toBe(`https://www.youtube.com/watch?v=${VID}`)
    expect(screen.getByText(en.help_subtitles_hint)).toBeTruthy()
    expect(screen.queryByText(en.help_video_coming_soon)).toBeNull()
  })

  it('renders the Greek SOP', async () => {
    vi.mocked(getLangServer).mockResolvedValue('el')
    await show(TopicPage, par('translations'))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(HELP_CONTENT.translations.el.title)
  })
})

describe('admin nav entry', () => {
  it('has a Help link as the last entry and marks it active on a topic page', () => {
    pathnameRef.value = '/admin/help/crm'
    render(<SysAdminNav tr={en} adminEmail="a@b.c" />)
    const links = screen.getAllByRole('link', { name: new RegExp(en.nav_help) })
    const help = links[0]
    expect(help.getAttribute('href')).toBe('/admin/help')
    expect(help.getAttribute('aria-current')).toBe('page')
    const all = within(screen.getAllByRole('navigation')[0]).getAllByRole('link')
    expect(all[all.length - 1]).toBe(help)
    expect(all.filter((a) => a.getAttribute('aria-current') === 'page').length).toBe(1)
    pathnameRef.value = '/admin/dashboard'
  })
})
