import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ─── Mock next/navigation ─────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/admin/dashboard',
  useParams: () => ({ categoryId: '1' }),
}))

// ─── Mock next/dynamic (LocationEditor uses it) ──────────────────────────────
vi.mock('next/dynamic', () => ({
  default: (_fn: unknown) => () => <div data-testid="map-placeholder">Map</div>,
}))

// ─── Mock next/image ─────────────────────────────────────────────────────────
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

// ─── OpeningHoursEditor ───────────────────────────────────────────────────────

import { OpeningHoursEditor } from '@/components/system-admin/OpeningHoursEditor'

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

describe('OpeningHoursEditor', () => {
  it('renders 7 day rows', () => {
    const onChange = vi.fn()
    render(
      <OpeningHoursEditor
        value={null}
        onChange={onChange}
        dayLabels={DAY_LABELS}
        closedLabel="Closed"
        fromLabel="From"
        untilLabel="Until"
        secondSlotLabel="Second slot"
        addSecondSlotLabel="Add second slot"
        removeSecondSlotLabel="Remove second slot"
      />,
    )
    for (const day of DAY_LABELS) {
      expect(screen.getByText(day)).toBeDefined()
    }
  })

  it('renders closed checkboxes for all days', () => {
    const onChange = vi.fn()
    render(
      <OpeningHoursEditor
        value={null}
        onChange={onChange}
        dayLabels={DAY_LABELS}
        closedLabel="Closed"
        fromLabel="From"
        untilLabel="Until"
        secondSlotLabel="Second slot"
        addSecondSlotLabel="Add second slot"
        removeSecondSlotLabel="Remove second slot"
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(7)
  })

  it('calls onChange when closed checkbox toggled', () => {
    const onChange = vi.fn()
    render(
      <OpeningHoursEditor
        value={null}
        onChange={onChange}
        dayLabels={DAY_LABELS}
        closedLabel="Closed"
        fromLabel="From"
        untilLabel="Until"
        secondSlotLabel="Second slot"
        addSecondSlotLabel="Add second slot"
        removeSecondSlotLabel="Remove second slot"
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onChange).toHaveBeenCalledOnce()
    const result = onChange.mock.calls[0][0]
    expect(result['0'].closed).toBe(true)
  })

  it('shows add-second-slot button when day is open', () => {
    const { container } = render(
      <OpeningHoursEditor
        value={null}
        onChange={vi.fn()}
        dayLabels={DAY_LABELS}
        closedLabel="Closed"
        fromLabel="From"
        untilLabel="Until"
        secondSlotLabel="Second slot"
        addSecondSlotLabel="Add second slot"
        removeSecondSlotLabel="Remove second slot"
      />,
    )
    const addButtons = container.querySelectorAll('button')
    expect(addButtons.length).toBeGreaterThan(0)
    expect(Array.from(addButtons).some((b) => b.textContent?.includes('Add second slot'))).toBe(true)
  })

  it('initialises from provided value', () => {
    const value = {
      '0': { open: '08:00', close: '20:00', closed: false },
      '6': { open: '00:00', close: '00:00', closed: true },
    }
    render(
      <OpeningHoursEditor
        value={value}
        onChange={vi.fn()}
        dayLabels={DAY_LABELS}
        closedLabel="Closed"
        fromLabel="From"
        untilLabel="Until"
        secondSlotLabel="Second slot"
        addSecondSlotLabel="Add second slot"
        removeSecondSlotLabel="Remove second slot"
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    // Day 0 (Monday) is open → unchecked
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false)
    // Day 6 (Sunday) is closed → checked
    expect((checkboxes[6] as HTMLInputElement).checked).toBe(true)
  })
})

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

import { ConfirmDialog } from '@/components/system-admin/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        message="Delete?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isPending={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog when open=true', () => {
    render(
      <ConfirmDialog
        open
        message="Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isPending={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('Are you sure?')).toBeDefined()
    expect(screen.getByText('Delete')).toBeDefined()
    expect(screen.getByText('Cancel')).toBeDefined()
  })

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        message="Delete?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isPending={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Delete'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        message="Delete?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isPending={false}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables buttons while pending', () => {
    render(
      <ConfirmDialog
        open
        message="Delete?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isPending
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons.every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })
})

// ─── AttributeDefinitionEditor ────────────────────────────────────────────────

import { AttributeDefinitionEditor } from '@/components/system-admin/AttributeDefinitionEditor'

describe('AttributeDefinitionEditor', () => {
  const base: import('@/components/system-admin/AttributeDefinitionEditor').AttrDefDraft = {
    attribute_key: 'weight', labels: { en: 'Weight' }, attribute_type: 'text', allowed_values: null,
    unit: null, is_filterable: false, display_order: 0, override_mode: 'merge',
    value_labels: null, created_at: '', updated_at: '',
  }

  it('renders key, label, type fields', () => {
    render(
      <AttributeDefinitionEditor
        value={base}
        onChange={vi.fn()}
        keyLabel="Key"
        labelLabel="Label"
        typeLabel="Type"
        optionsLabel="Options"
        optionsHint="Comma-separated"
      />,
    )
    // Key and Label are labels (no htmlFor), verify by text
    expect(screen.getByText('Key')).toBeDefined()
    // Label text appears twice (label + legend), getByText with exact=false
    expect(screen.getAllByText(/^Label/).length).toBeGreaterThan(0)
    expect(screen.getByRole('combobox')).toBeDefined() // type select
  })

  it('does NOT show options input when type != select', () => {
    render(
      <AttributeDefinitionEditor
        value={base}
        onChange={vi.fn()}
        keyLabel="Key"
        labelLabel="Label"
        typeLabel="Type"
        optionsLabel="Options"
        optionsHint="Comma-separated"
      />,
    )
    expect(screen.queryByLabelText(/Options/)).toBeNull()
  })

  it('shows options input when type = select', () => {
    render(
      <AttributeDefinitionEditor
        value={{ ...base, attribute_type: 'select', allowed_values: ['A', 'B'] }}
        onChange={vi.fn()}
        keyLabel="Key"
        labelLabel="Label"
        typeLabel="Type"
        optionsLabel="Options"
        optionsHint="Comma-separated"
      />,
    )
    // Options label text should appear
    expect(screen.getByText('Options')).toBeDefined()
    // The options input has a placeholder
    expect(screen.getByPlaceholderText(/Option A/)).toBeDefined()
  })

  it('parses comma-separated options and calls onChange', () => {
    const onChange = vi.fn()
    render(
      <AttributeDefinitionEditor
        value={{ ...base, attribute_type: 'select', allowed_values: [] }}
        onChange={onChange}
        keyLabel="Key"
        labelLabel="Label"
        typeLabel="Type"
        optionsLabel="Options"
        optionsHint="Comma-separated"
      />,
    )
    const optInput = screen.getByPlaceholderText(/Option A/)
    fireEvent.change(optInput, { target: { value: 'Red, Green, Blue' } })
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(last.allowed_values).toEqual(['Red', 'Green', 'Blue'])
  })

  it('renders tag chips for existing options', () => {
    render(
      <AttributeDefinitionEditor
        value={{ ...base, attribute_type: 'select', allowed_values: ['XS', 'M', 'XL'] }}
        onChange={vi.fn()}
        keyLabel="Key"
        labelLabel="Label"
        typeLabel="Type"
        optionsLabel="Options"
        optionsHint="Comma-separated"
      />,
    )
    expect(screen.getByText('XS')).toBeDefined()
    expect(screen.getByText('M')).toBeDefined()
    expect(screen.getByText('XL')).toBeDefined()
  })
})

// ─── FormField (system-admin) ─────────────────────────────────────────────────

import { FormField } from '@/components/system-admin/FormField'

describe('system-admin FormField', () => {
  it('renders label and input', () => {
    render(<FormField label="Name" name="name" />)
    expect(screen.getByLabelText('Name')).toBeDefined()
  })

  it('shows required asterisk', () => {
    render(<FormField label="Email" name="email" required />)
    expect(screen.getByText('*')).toBeDefined()
  })

  it('shows error message', () => {
    render(<FormField label="Name" name="name" error="Required" />)
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Required')).toBeDefined()
  })

  it('renders textarea when as=textarea', () => {
    render(<FormField label="Desc" name="desc" as="textarea" />)
    expect(screen.getByRole('textbox')).toBeDefined()
  })

  it('renders select when as=select', () => {
    render(
      <FormField label="Type" name="type" as="select">
        <option value="a">A</option>
      </FormField>,
    )
    expect(screen.getByRole('combobox')).toBeDefined()
  })
})
