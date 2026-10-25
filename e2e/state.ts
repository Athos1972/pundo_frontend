/** Per-slot state paths; slot 0 preserves the historical filenames. */
import path from 'path'

const slot = /^[1-5]$/.test(process.env.PUNDO_SLOT ?? '') ? process.env.PUNDO_SLOT : '0'
const stateDir = slot === '0' ? __dirname : process.env.E2E_STATE_DIR

if (!stateDir) {
  throw new Error('[E2E] a worktree slot needs E2E_STATE_DIR from its controller-managed frontend.env.')
}

export const E2E_SLOT = Number(slot)
export const E2E_STATE_FILE = path.join(stateDir, '.test-state.json')
export const E2E_ADMIN_STATE_FILE = path.join(stateDir, '.auth', 'admin.json')
