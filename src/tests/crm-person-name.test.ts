// F7600 CRM-Backbone, org cut, T16: name derivation preview and the person catalogs (crmPersonName.ts).
// The preview must give exactly the name the backend stores (PersonService.derive_display_name); the recorded answers of
// the slot backend are the reference (e2e/fixtures/contracts/crm-persons, see src/tests/helpers/crm-person-recorded.ts).
import { describe, expect, it } from 'vitest'
import {
  ROLE_CATALOG, SALUTATIONS, deriveDisplayName, nameReplacement, roleLabel, salutationLabel,
} from '@/components/system-admin/crm/crmPersonName'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { recorded } from './helpers/crm-person-recorded'
import type { CrmPerson } from '@/types/system-admin'

const en = tSysAdmin('en')
const el = tSysAdmin('el')

describe('deriveDisplayName (same rule as the backend)', () => {
  it.each([
    ['Maria', 'Georgiou', 'Maria Georgiou'],
    [null, 'Georgiou', 'Georgiou'],            // AC 30: only the last name, no leading space
    ['Maria', null, 'Maria'],
    ['  Maria ', ' Georgiou  ', 'Maria Georgiou'],
    ['', '   ', null],
    [null, undefined, null],
    ['Μαρία', 'Γεωργίου', 'Μαρία Γεωργίου'],    // R7: Greek name split by hand
  ])('%j + %j -> %j', (first, last, expected) => {
    expect(deriveDisplayName(first, last)).toBe(expected)
  })

  it('matches the name the backend stored when the person was created with first and last name', () => {
    const { body } = recorded<CrmPerson>('person-create-derived')
    expect(body.name_derived).toBe(true)
    expect(deriveDisplayName(body.first_name, body.last_name)).toBe(body.display_name)
  })

  it('matches the backend after a free name was split (AC 32)', () => {
    const { status, body } = recorded<CrmPerson>('person-patch-derive')
    expect(status).toBe(200)
    expect(body.name_derived).toBe(true)
    expect(deriveDisplayName(body.first_name, body.last_name)).toBe(body.display_name)
  })

  it('a free name stays free in the backend answer (no parts, nothing derived)', () => {
    const { body } = recorded<CrmPerson>('person-create-free')
    expect(body).toMatchObject({ display_name: 'Γεωργίου Ελένη', first_name: null, last_name: null, name_derived: false })
    expect(deriveDisplayName(body.first_name, body.last_name)).toBeNull()
  })
})

describe('nameReplacement (notice before a derivation replaces a free name)', () => {
  const free = { display_name: 'Γεωργίου Μαρία', first_name: null, last_name: null }

  it('free name + new parts -> old and new name', () => {
    expect(nameReplacement(free, 'Μαρία', 'Γεωργίου')).toEqual({ from: 'Γεωργίου Μαρία', to: 'Μαρία Γεωργίου' })
  })

  it('no notice while the parts are empty', () => {
    expect(nameReplacement(free, ' ', '')).toBeNull()
  })

  it('no notice when the derived name equals the free name', () => {
    expect(nameReplacement({ display_name: 'Maria Georgiou', first_name: null, last_name: null }, 'Maria', 'Georgiou')).toBeNull()
  })

  it('no notice when the name was derived already (nothing free is lost)', () => {
    expect(nameReplacement({ display_name: 'Maria Georgiou', first_name: 'Maria', last_name: 'Georgiou' }, 'Maria', 'Papadopoulou')).toBeNull()
  })

  it('no notice for a person without any name', () => {
    expect(nameReplacement({ display_name: null, first_name: null, last_name: null }, 'Maria', '')).toBeNull()
  })
})

describe('catalogs', () => {
  it('salutations: the five values of the backend, translated in EN and EL; null = not set', () => {
    expect(SALUTATIONS).toEqual(['mr', 'ms', 'mx', 'dr', 'none'])
    expect(SALUTATIONS.map((s) => salutationLabel(en, s))).toEqual(['Mr', 'Ms', 'Mx', 'Dr', 'No salutation'])
    for (const s of SALUTATIONS) expect(salutationLabel(el, s)).not.toBe(s)
    expect(salutationLabel(el, 'ms')).toBe('Κα')
    expect(salutationLabel(en, null)).toBeNull()
    expect(salutationLabel(en, 'sir')).toBe('sir')
  })

  it('roles: ROLE_CATALOG of the backend, every role translated in EN and EL; an unknown code stays visible', () => {
    expect(ROLE_CATALOG).toEqual(['owner', 'advisor', 'server_operator', 'employee', 'service_staff', 'manager', 'contact', 'accountant', 'it'])
    for (const role of ROLE_CATALOG) {
      expect(roleLabel(en, role)).not.toBe(role)
      expect(roleLabel(el, role)).not.toBe(roleLabel(en, role))
    }
    expect(roleLabel(en, 'manager')).toBe('Manager')
    expect(roleLabel(el, 'accountant')).toBe('Λογιστής/τρια')
    expect(roleLabel(en, 'new_backend_role')).toBe('new_backend_role')
  })

  it('every role of the recorded relations is in the catalog', () => {
    const { body } = recorded<CrmPerson>('person-detail')
    for (const role of body.relations.flatMap((relation) => relation.roles)) {
      expect(ROLE_CATALOG).toContain(role)
    }
  })
})
