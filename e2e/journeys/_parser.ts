/**
 * Journey Catalog Parser
 *
 * Parses and serializes e2e/journeys/CATALOG.md.
 * Pure logic — no browser, no Next.js, no new npm dependencies.
 * Used by agents to read/write the catalog programmatically.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JourneyEntry {
  id: string
  title: string
  status: 'proposed' | 'approved' | 'implemented' | 'skipped' | 'deprecated'
  priority: 'P1' | 'P2' | 'P3'
  ownerAgent: 'designer' | 'architect' | 'coder' | 'e2e-tester'
  proposedInSpec: string
  touchesModules: string[]
  touchesRoles?: ('guest' | 'customer' | 'shop-owner' | 'admin')[]
  touchesStates?: string[]
  specFile?: string
  statusChangedAt: string        // ISO-8601
  statusChangedBySpec: string
  skipReason?: string
  lastRun: string                // ISO-8601 | "never"
  lastResult: 'PASS' | 'FAIL' | 'SKIP' | 'N/A'
  lastRunSha?: string | null
  supersededBy?: string | null
  body: string                   // Markdown after frontmatter
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class JourneyCatalogError extends Error {
  constructor(
    message: string,
    public readonly lineNumber?: number,
    public readonly entryId?: string,
  ) {
    super(
      lineNumber != null
        ? `JourneyCatalogError at line ${lineNumber}: ${message}`
        : `JourneyCatalogError: ${message}`,
    )
    this.name = 'JourneyCatalogError'
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Split the full catalog markdown into [header, ...rawEntries].
 * Each entry is the text between two `---` boundary lines.
 */
function splitIntoBlocks(markdown: string): { header: string; rawBlocks: string[] } {
  const lines = markdown.split('\n')
  const rawBlocks: string[] = []
  let header = ''
  let inFrontmatter = false
  let currentBlock: string[] = []
  let lineOffset = 0 // tracks line numbers for error reporting

  // The first `---` starts the first frontmatter block.
  // Everything before the first `---` is the file header.
  let headerLines: string[] = []
  let i = 0

  while (i < lines.length) {
    if (!inFrontmatter && lines[i].trim() === '---') {
      // start of a new frontmatter block
      header = headerLines.join('\n')
      inFrontmatter = true
      currentBlock = ['---']
      lineOffset = i
      i++
      continue
    }

    if (!inFrontmatter) {
      headerLines.push(lines[i])
      i++
      continue
    }

    // inside frontmatter or body
    currentBlock.push(lines[i])

    if (lines[i].trim() === '---' && currentBlock.length > 1) {
      // closing `---` of frontmatter
      // now consume the body until next opening `---`
      i++
      while (i < lines.length) {
        if (lines[i].trim() === '---') {
          // start of next block — do NOT consume this line
          break
        }
        currentBlock.push(lines[i])
        i++
      }
      rawBlocks.push(currentBlock.join('\n'))
      inFrontmatter = false
      currentBlock = []
      // next iteration will handle the opening `---` of the next block
      continue
    }

    i++
  }

  // Trailing block without closing `---`
  if (currentBlock.length > 0) {
    rawBlocks.push(currentBlock.join('\n'))
  }

  return { header: header.trim(), rawBlocks }
}

/**
 * Parse a raw block string into { frontmatter: string, body: string }.
 * The block starts with `---`, ends with `---` for frontmatter, rest is body.
 */
function splitBlock(raw: string): { frontmatter: string; body: string } {
  const lines = raw.split('\n')
  if (lines[0].trim() !== '---') {
    throw new JourneyCatalogError('Block does not start with ---')
  }

  let closingIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIdx = i
      break
    }
  }

  if (closingIdx === -1) {
    throw new JourneyCatalogError('Frontmatter block never closed with ---')
  }

  const frontmatter = lines.slice(1, closingIdx).join('\n')
  const body = lines.slice(closingIdx + 1).join('\n').trimStart()

  return { frontmatter, body }
}

/**
 * Minimal YAML parser — handles only the subset used in CATALOG.md.
 * Supports: scalar strings, block scalars (>), and sequence lists (- item).
 * Does NOT handle nested mappings, anchors, or complex YAML.
 */
function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = yaml.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip blank lines and comment lines
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i++
      continue
    }

    const keyMatch = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (!keyMatch) {
      i++
      continue
    }

    const key = keyMatch[1]
    const valueRaw = keyMatch[2].trim()

    // Block scalar >  (folded, used for skip-reason)
    if (valueRaw === '>') {
      const blockLines: string[] = []
      i++
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].startsWith('\t'))) {
        blockLines.push(lines[i].trim())
        i++
      }
      result[key] = blockLines.join(' ')
      continue
    }

    // Sequence — next lines start with `  -`
    if (valueRaw === '') {
      const listItems: string[] = []
      i++
      while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
        listItems.push(lines[i].replace(/^\s+-\s+/, '').trim())
        i++
      }
      if (listItems.length > 0) {
        result[key] = listItems
      } else {
        result[key] = null
      }
      continue
    }

    // null literal
    if (valueRaw === 'null' || valueRaw === '~') {
      result[key] = null
      i++
      continue
    }

    result[key] = valueRaw
    i++
  }

  return result
}

// ---------------------------------------------------------------------------
// Required field definitions
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS = [
  'id',
  'title',
  'status',
  'priority',
  'owner-agent',
  'proposed-in-spec',
  'touches-modules',
  'status-changed-at',
  'status-changed-by-spec',
  'last-run',
  'last-result',
] as const

const VALID_STATUS = ['proposed', 'approved', 'implemented', 'skipped', 'deprecated'] as const
const VALID_PRIORITY = ['P1', 'P2', 'P3'] as const
const VALID_OWNER_AGENT = ['designer', 'architect', 'coder', 'e2e-tester'] as const
const VALID_LAST_RESULT = ['PASS', 'FAIL', 'SKIP', 'N/A'] as const

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

/**
 * Parse the full CATALOG.md content into an array of JourneyEntry objects.
 * Throws JourneyCatalogError if any required field is missing or invalid.
 */
export function parseCatalog(markdown: string): JourneyEntry[] {
  const { rawBlocks } = splitIntoBlocks(markdown)

  if (rawBlocks.length === 0) {
    return []
  }

  return rawBlocks.map((raw, idx) => {
    const { frontmatter, body } = splitBlock(raw)
    const yaml = parseYaml(frontmatter)

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (yaml[field] === undefined || yaml[field] === null || yaml[field] === '') {
        // Estimate line number by counting lines before this block
        const blocksBeforeThis = markdown
          .split('\n')
          .findIndex((l, i) =>
            l.trim() === '---' &&
            markdown.split('\n').slice(i + 1).join('\n').includes(String(yaml['id'] ?? idx)),
          )
        throw new JourneyCatalogError(
          `Missing required field '${field}' in entry #${idx + 1} (id: ${yaml['id'] ?? 'unknown'})`,
          undefined,
          String(yaml['id'] ?? `entry-${idx + 1}`),
        )
      }
    }

    const id = String(yaml['id'])
    const status = String(yaml['status'])
    const priority = String(yaml['priority'])
    const ownerAgent = String(yaml['owner-agent'])
    const lastResult = String(yaml['last-result'])

    // Enum validation
    if (!VALID_STATUS.includes(status as typeof VALID_STATUS[number])) {
      throw new JourneyCatalogError(
        `Invalid status '${status}' in entry '${id}'. Must be one of: ${VALID_STATUS.join(', ')}`,
        undefined,
        id,
      )
    }

    if (!VALID_PRIORITY.includes(priority as typeof VALID_PRIORITY[number])) {
      throw new JourneyCatalogError(
        `Invalid priority '${priority}' in entry '${id}'. Must be one of: ${VALID_PRIORITY.join(', ')}`,
        undefined,
        id,
      )
    }

    if (!VALID_OWNER_AGENT.includes(ownerAgent as typeof VALID_OWNER_AGENT[number])) {
      throw new JourneyCatalogError(
        `Invalid owner-agent '${ownerAgent}' in entry '${id}'. Must be one of: ${VALID_OWNER_AGENT.join(', ')}`,
        undefined,
        id,
      )
    }

    if (!VALID_LAST_RESULT.includes(lastResult as typeof VALID_LAST_RESULT[number])) {
      throw new JourneyCatalogError(
        `Invalid last-result '${lastResult}' in entry '${id}'. Must be one of: ${VALID_LAST_RESULT.join(', ')}`,
        undefined,
        id,
      )
    }

    // skipped/deprecated require skip-reason
    if ((status === 'skipped' || status === 'deprecated') && !yaml['skip-reason']) {
      throw new JourneyCatalogError(
        `Entry '${id}' has status '${status}' but missing required field 'skip-reason'`,
        undefined,
        id,
      )
    }

    const touchesModules = yaml['touches-modules']
    if (!Array.isArray(touchesModules) || touchesModules.length === 0) {
      throw new JourneyCatalogError(
        `Entry '${id}' has empty or invalid 'touches-modules' — must be a non-empty list`,
        undefined,
        id,
      )
    }

    const entry: JourneyEntry = {
      id,
      title: String(yaml['title']),
      status: status as JourneyEntry['status'],
      priority: priority as JourneyEntry['priority'],
      ownerAgent: ownerAgent as JourneyEntry['ownerAgent'],
      proposedInSpec: String(yaml['proposed-in-spec']),
      touchesModules: touchesModules as string[],
      statusChangedAt: String(yaml['status-changed-at']),
      statusChangedBySpec: String(yaml['status-changed-by-spec']),
      lastRun: String(yaml['last-run']),
      lastResult: lastResult as JourneyEntry['lastResult'],
      body,
    }

    // Optional fields
    const touchesRoles = yaml['touches-roles']
    if (Array.isArray(touchesRoles) && touchesRoles.length > 0) {
      entry.touchesRoles = touchesRoles as JourneyEntry['touchesRoles']
    }

    const touchesStates = yaml['touches-states']
    if (Array.isArray(touchesStates) && touchesStates.length > 0) {
      entry.touchesStates = touchesStates as string[]
    }

    if (yaml['spec-file']) {
      entry.specFile = String(yaml['spec-file'])
    }

    if (yaml['skip-reason']) {
      entry.skipReason = String(yaml['skip-reason'])
    }

    if (yaml['last-run-sha'] !== undefined) {
      entry.lastRunSha = yaml['last-run-sha'] === null ? null : String(yaml['last-run-sha'])
    }

    if (yaml['superseded-by'] !== undefined) {
      entry.supersededBy = yaml['superseded-by'] === null ? null : String(yaml['superseded-by'])
    }

    return entry
  })
}

// ---------------------------------------------------------------------------
// Serializer
// ---------------------------------------------------------------------------

/**
 * Serialize an array of JourneyEntry objects back to CATALOG.md format.
 * Preserves order of entries. Uses the provided header for the file header.
 */
export function serializeCatalog(entries: JourneyEntry[], header: string): string {
  const parts: string[] = [header, '']

  for (const entry of entries) {
    const lines: string[] = ['---']

    lines.push(`id: ${entry.id}`)
    lines.push(`title: ${entry.title}`)
    lines.push(`status: ${entry.status}`)
    lines.push(`priority: ${entry.priority}`)
    lines.push(`owner-agent: ${entry.ownerAgent}`)
    lines.push(`proposed-in-spec: ${entry.proposedInSpec}`)

    lines.push('touches-modules:')
    for (const mod of entry.touchesModules) {
      lines.push(`  - ${mod}`)
    }

    if (entry.touchesRoles && entry.touchesRoles.length > 0) {
      lines.push('touches-roles:')
      for (const role of entry.touchesRoles) {
        lines.push(`  - ${role}`)
      }
    }

    if (entry.touchesStates && entry.touchesStates.length > 0) {
      lines.push('touches-states:')
      for (const state of entry.touchesStates) {
        lines.push(`  - ${state}`)
      }
    }

    if (entry.specFile) {
      lines.push(`spec-file: ${entry.specFile}`)
    }

    lines.push(`status-changed-at: ${entry.statusChangedAt}`)
    lines.push(`status-changed-by-spec: ${entry.statusChangedBySpec}`)

    if (entry.skipReason) {
      lines.push(`skip-reason: >`)
      lines.push(`  ${entry.skipReason}`)
    }

    lines.push(`last-run: ${entry.lastRun}`)
    lines.push(`last-result: ${entry.lastResult}`)

    if (entry.lastRunSha !== undefined) {
      lines.push(`last-run-sha: ${entry.lastRunSha === null ? 'null' : entry.lastRunSha}`)
    }

    if (entry.supersededBy !== undefined) {
      lines.push(`superseded-by: ${entry.supersededBy === null ? 'null' : entry.supersededBy}`)
    }

    lines.push('---')
    lines.push('')
    lines.push(entry.body)
    lines.push('')

    parts.push(lines.join('\n'))
  }

  return parts.join('\n').trimEnd() + '\n'
}

// ---------------------------------------------------------------------------
// findOverlap
// ---------------------------------------------------------------------------

/**
 * Compute Jaccard overlap between a proposed journey's touchesModules
 * and each catalog entry's touchesModules.
 *
 * Returns entries where overlap >= threshold (default 0.5), sorted by overlap desc.
 *
 * Glob normalization: treat `**` as a wildcard token, `[param]` patterns are
 * normalized to `[*]` for comparison purposes.
 */
export function findOverlap(
  proposed: Pick<JourneyEntry, 'touchesModules'>,
  catalog: JourneyEntry[],
  threshold = 0.5,
): { entry: JourneyEntry; overlap: number }[] {
  const normalize = (glob: string): string =>
    glob.replace(/\[.*?\]/g, '[*]').replace(/\/\*\*$/, '/**')

  const proposedSet = new Set(proposed.touchesModules.map(normalize))

  const results: { entry: JourneyEntry; overlap: number }[] = []

  for (const entry of catalog) {
    const entrySet = new Set(entry.touchesModules.map(normalize))

    const intersection = new Set([...proposedSet].filter((m) => entrySet.has(m)))
    const union = new Set([...proposedSet, ...entrySet])

    if (union.size === 0) continue

    const overlap = intersection.size / union.size

    if (overlap >= threshold) {
      results.push({ entry, overlap })
    }
  }

  return results.sort((a, b) => b.overlap - a.overlap)
}
