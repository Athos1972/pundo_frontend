import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SocialLinksEditor } from '@/components/ui/SocialLinksEditor'

const DEFAULT_PROPS = {
  value: null,
  onChange: vi.fn(),
  titleLabel: 'Social media',
  otherLabel: 'Other',
  platformNameLabel: 'Platform name',
  urlLabel: 'URL',
}

describe('SocialLinksEditor', () => {
  it('renders all 6 fixed platform labels', () => {
    render(<SocialLinksEditor {...DEFAULT_PROPS} />)
    expect(screen.getByText('Facebook')).toBeDefined()
    expect(screen.getByText('Instagram')).toBeDefined()
    expect(screen.getByText('TikTok')).toBeDefined()
    expect(screen.getByText('YouTube')).toBeDefined()
    expect(screen.getByText('LinkedIn')).toBeDefined()
    expect(screen.getByText('X / Twitter')).toBeDefined()
  })

  it('renders section title and other-platform label', () => {
    render(<SocialLinksEditor {...DEFAULT_PROPS} />)
    expect(screen.getByText('Social media')).toBeDefined()
    expect(screen.getByText('Other')).toBeDefined()
  })

  it('all URL inputs are empty when value is null', () => {
    render(<SocialLinksEditor {...DEFAULT_PROPS} />)
    const urlInputs = screen.getAllByPlaceholderText('https://...')
    urlInputs.forEach((input) => {
      expect((input as HTMLInputElement).value).toBe('')
    })
  })

  it('pre-populates known platform inputs from value prop', () => {
    render(
      <SocialLinksEditor
        {...DEFAULT_PROPS}
        value={{ facebook: 'https://fb.com/test', instagram: 'https://ig.com/test' }}
      />
    )
    const inputs = screen.getAllByPlaceholderText('https://...') as HTMLInputElement[]
    // facebook is first in FIXED_PLATFORMS list
    expect(inputs[0].defaultValue).toBe('https://fb.com/test')
    // instagram is second
    expect(inputs[1].defaultValue).toBe('https://ig.com/test')
  })

  it('puts unknown key from value into the "other" field', () => {
    render(
      <SocialLinksEditor
        {...DEFAULT_PROPS}
        value={{ pinterest: 'https://pinterest.com/test' }}
      />
    )
    const platformNameInput = screen.getByPlaceholderText('Platform name') as HTMLInputElement
    expect(platformNameInput.value).toBe('pinterest')
  })

  it('calls onChange with correct Record when a fixed URL is entered', () => {
    const onChange = vi.fn()
    render(<SocialLinksEditor {...DEFAULT_PROPS} onChange={onChange} />)
    const inputs = screen.getAllByPlaceholderText('https://...') as HTMLInputElement[]
    fireEvent.change(inputs[0], { target: { value: 'https://facebook.com/myshop' } })
    expect(onChange).toHaveBeenCalledWith({ facebook: 'https://facebook.com/myshop' })
  })

  it('calls onChange with null when all inputs are cleared', () => {
    const onChange = vi.fn()
    render(
      <SocialLinksEditor
        {...DEFAULT_PROPS}
        onChange={onChange}
        value={{ facebook: 'https://fb.com/test' }}
      />
    )
    const inputs = screen.getAllByPlaceholderText('https://...') as HTMLInputElement[]
    fireEvent.change(inputs[0], { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows inline error for invalid URL and calls onValidChange(false)', () => {
    const onValidChange = vi.fn()
    render(<SocialLinksEditor {...DEFAULT_PROPS} onValidChange={onValidChange} />)
    const inputs = screen.getAllByPlaceholderText('https://...') as HTMLInputElement[]
    fireEvent.change(inputs[0], { target: { value: 'not-a-url' } })
    expect(screen.getByText('Invalid URL')).toBeDefined()
    expect(onValidChange).toHaveBeenCalledWith(false)
  })

  it('clears error and calls onValidChange(true) after fixing invalid URL', () => {
    const onValidChange = vi.fn()
    render(<SocialLinksEditor {...DEFAULT_PROPS} onValidChange={onValidChange} />)
    const inputs = screen.getAllByPlaceholderText('https://...') as HTMLInputElement[]
    fireEvent.change(inputs[0], { target: { value: 'bad' } })
    expect(screen.getByText('Invalid URL')).toBeDefined()
    fireEvent.change(inputs[0], { target: { value: 'https://facebook.com/ok' } })
    expect(screen.queryByText('Invalid URL')).toBeNull()
    expect(onValidChange).toHaveBeenLastCalledWith(true)
  })

  it('does not include empty fixed platform URLs in onChange payload', () => {
    const onChange = vi.fn()
    render(<SocialLinksEditor {...DEFAULT_PROPS} onChange={onChange} value={{ instagram: 'https://ig.com' }} />)
    // Clear instagram (index 1)
    const inputs = screen.getAllByPlaceholderText('https://...') as HTMLInputElement[]
    fireEvent.change(inputs[1], { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('other field: both key and URL required — only URL without key not included', () => {
    const onChange = vi.fn()
    render(<SocialLinksEditor {...DEFAULT_PROPS} onChange={onChange} />)
    const urlInputs = screen.getAllByPlaceholderText(/URL: https/) as HTMLInputElement[]
    fireEvent.change(urlInputs[0], { target: { value: 'https://example.com' } })
    // key is empty → should not include it
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('other field: key + valid URL → included in onChange payload', () => {
    const onChange = vi.fn()
    render(<SocialLinksEditor {...DEFAULT_PROPS} onChange={onChange} />)
    const platformNameInput = screen.getByPlaceholderText('Platform name')
    const urlInput = screen.getAllByPlaceholderText(/URL: https/)[0]
    fireEvent.change(platformNameInput, { target: { value: 'snapchat' } })
    fireEvent.change(urlInput, { target: { value: 'https://snapchat.com/add/me' } })
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall).toMatchObject({ snapchat: 'https://snapchat.com/add/me' })
  })

  it('disabled prop disables all inputs', () => {
    render(<SocialLinksEditor {...DEFAULT_PROPS} disabled />)
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    inputs.forEach((input) => {
      expect(input.disabled).toBe(true)
    })
  })
})
