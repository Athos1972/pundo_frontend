import '@testing-library/jest-dom'

// Node 25+ ships a built-in localStorage without .clear() — override with a proper in-memory stub
// so jsdom-based tests can call localStorage.clear() in beforeEach/afterEach.
;(() => {
  let store: Record<string, string> = {}
  const mock: Storage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true })
})()
