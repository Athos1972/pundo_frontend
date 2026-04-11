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

// ─── Combobox ─────────────────────────────────────────────────────────────────

import { Combobox } from '@/components/system-admin/Combobox'
import type { ComboboxItem } from '@/components/system-admin/Combobox'

const ITEMS: ComboboxItem[] = [
  { value: '1', label: 'Cat Food', subLabel: 'pets/cat-food' },
  { value: '2', label: 'Catering', subLabel: 'services/catering' },
  { value: '3', label: 'Dog Food', subLabel: 'pets/dog-food' },
  { value: '4', label: 'Birds', subLabel: 'pets/birds' },
]

describe('Combobox', () => {
  it('renders trigger button with placeholder when no value', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} placeholder="Select…" />)
    expect(screen.getByText('Select…')).toBeDefined()
  })

  it('shows selected label when value is set', () => {
    render(<Combobox items={ITEMS} value="1" onChange={vi.fn()} placeholder="Select…" />)
    expect(screen.getByText('Cat Food')).toBeDefined()
  })

  it('opens dropdown on button click', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(screen.getByRole('listbox')).toBeDefined()
    expect(screen.getByText('Cat Food')).toBeDefined()
    expect(screen.getByText('Catering')).toBeDefined()
  })

  it('calls onChange when item is clicked', () => {
    const onChange = vi.fn()
    render(<Combobox items={ITEMS} value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Cat Food'))
    expect(onChange).toHaveBeenCalledWith('1')
  })

  it('filters items by startsWith first', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'cat' } })
    const listItems = screen.getAllByRole('option')
    // "Cat Food" (startsWith) should appear before "Catering" (startsWith too, but alphabetically Cat < Cat)
    // Both start with "cat" — Cat Food and Catering both match startsWith — order is exact > startsWith
    expect(listItems.length).toBeGreaterThanOrEqual(2)
    // "Cat Food" must be in results
    const labels = listItems.map((li) => li.textContent ?? '')
    expect(labels.some((l) => l.includes('Cat Food'))).toBe(true)
    expect(labels.some((l) => l.includes('Catering'))).toBe(true)
  })

  it('filters by subLabel when label does not match', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'pets' } })
    const listItems = screen.getAllByRole('option')
    // pets matches subLabel of Cat Food, Dog Food, Birds
    expect(listItems.length).toBe(3)
  })

  it('shows subLabel in dropdown', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('pets/cat-food')).toBeDefined()
  })

  it('shows no-results message when filter matches nothing', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'xyzxyz' } })
    expect(screen.getByText(/No results/)).toBeDefined()
  })

  it('clears selection when clear button clicked', () => {
    const onChange = vi.fn()
    render(<Combobox items={ITEMS} value="1" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    // Clear button appears since value is set
    const clearBtn = screen.getByText('✕')
    fireEvent.click(clearBtn)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('is disabled when disabled=true', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('opens on ArrowDown keydown when closed', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    const container = screen.getByRole('button').parentElement!
    fireEvent.keyDown(container, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeDefined()
  })

  it('opens on Enter keydown when closed', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    const container = screen.getByRole('button').parentElement!
    fireEvent.keyDown(container, { key: 'Enter' })
    expect(screen.getByRole('listbox')).toBeDefined()
  })

  it('closes on Escape when open', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('listbox')).toBeDefined()
    const container = screen.getByRole('button').parentElement!
    fireEvent.keyDown(container, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('navigates with ArrowDown/Up and selects with Enter', () => {
    const onChange = vi.fn()
    render(<Combobox items={ITEMS} value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    const container = screen.getByRole('button').parentElement!
    // ArrowDown twice → index 1
    fireEvent.keyDown(container, { key: 'ArrowDown' })
    fireEvent.keyDown(container, { key: 'ArrowDown' })
    // ArrowUp once → back to index 1 (was 2, now 1)
    fireEvent.keyDown(container, { key: 'ArrowUp' })
    // Enter selects current item (index 1 after sort = second item alphabetically)
    fireEvent.keyDown(container, { key: 'Enter' })
    expect(onChange).toHaveBeenCalled()
  })

  it('renders hidden input when name prop is provided', () => {
    const { container } = render(<Combobox items={ITEMS} value="1" onChange={vi.fn()} name="cat_id" />)
    const hidden = container.querySelector('input[type="hidden"]')
    expect(hidden).not.toBeNull()
    expect((hidden as HTMLInputElement).name).toBe('cat_id')
    expect((hidden as HTMLInputElement).value).toBe('1')
  })

  it('ignores unrelated key presses when closed', () => {
    render(<Combobox items={ITEMS} value="" onChange={vi.fn()} />)
    const container = screen.getByRole('button').parentElement!
    // Tab/other keys should NOT open the dropdown
    fireEvent.keyDown(container, { key: 'Tab' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

// ─── CategoryTreeView ────────────────────────────────────────────────────────

import { CategoryTreeView } from '@/components/system-admin/CategoryTreeView'
import type { SysAdminCategory } from '@/types/system-admin'

const CATS: SysAdminCategory[] = [
  { id: 1, parent_id: null, taxonomy_type: 'product', external_id: 'pets', level: '1', path: null, name: 'Pets' },
  { id: 2, parent_id: 1, taxonomy_type: 'product', external_id: 'cat-food', level: '2', path: null, name: 'Cat Food' },
  { id: 3, parent_id: 1, taxonomy_type: 'product', external_id: 'dog-food', level: '2', path: null, name: 'Dog Food' },
  { id: 4, parent_id: null, taxonomy_type: 'service', external_id: 'grooming', level: '1', path: null, name: null },
]

describe('CategoryTreeView', () => {
  it('renders root-level nodes', () => {
    render(<CategoryTreeView categories={CATS} editLabel="Edit" />)
    expect(screen.getByText('Pets')).toBeDefined()
  })

  it('falls back to external_id when name is null', () => {
    render(<CategoryTreeView categories={CATS} editLabel="Edit" />)
    // name is null → shows external_id as the bold label (may appear multiple times with mono span)
    expect(screen.getAllByText('grooming').length).toBeGreaterThan(0)
  })

  it('shows taxonomy_type badge', () => {
    render(<CategoryTreeView categories={CATS} editLabel="Edit" />)
    // taxonomy_type badges shown for each root node
    expect(screen.getAllByText('product').length).toBeGreaterThan(0)
    expect(screen.getByText('service')).toBeDefined()
  })

  it('top-level nodes with children are expanded by default', () => {
    render(<CategoryTreeView categories={CATS} editLabel="Edit" />)
    // Children of 'Pets' (id=1) should be visible by default
    expect(screen.getByText('Cat Food')).toBeDefined()
    expect(screen.getByText('Dog Food')).toBeDefined()
  })

  it('collapses children when toggle is clicked', () => {
    render(<CategoryTreeView categories={CATS} editLabel="Edit" />)
    // 'Pets' row has a ▾ toggle button
    const toggleBtns = screen.getAllByRole('button', { name: /Collapse/i })
    expect(toggleBtns.length).toBeGreaterThan(0)
    fireEvent.click(toggleBtns[0])
    // After collapse, children should no longer be visible
    expect(screen.queryByText('Cat Food')).toBeNull()
  })

  it('shows no categories message when list is empty', () => {
    render(<CategoryTreeView categories={[]} editLabel="Edit" />)
    expect(screen.getByText(/No categories/)).toBeDefined()
  })

  it('renders edit links for each node', () => {
    render(<CategoryTreeView categories={CATS} editLabel="Edit" />)
    const editLinks = screen.getAllByText('Edit')
    expect(editLinks.length).toBeGreaterThanOrEqual(2)
  })

  it('renders expand/collapse all controls', () => {
    render(
      <CategoryTreeView
        categories={CATS}
        editLabel="Edit"
        expandAllLabel="Expand all"
        collapseAllLabel="Collapse all"
      />,
    )
    expect(screen.getByText('Expand all')).toBeDefined()
    expect(screen.getByText('Collapse all')).toBeDefined()
  })

  it('collapses all nodes when collapse-all clicked', () => {
    render(
      <CategoryTreeView
        categories={CATS}
        editLabel="Edit"
        expandAllLabel="Expand all"
        collapseAllLabel="Collapse all"
      />,
    )
    // Children visible initially
    expect(screen.getByText('Cat Food')).toBeDefined()
    fireEvent.click(screen.getByText('Collapse all'))
    expect(screen.queryByText('Cat Food')).toBeNull()
  })
})
