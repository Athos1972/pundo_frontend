/**
 * ESLint rule: require-page-metadata
 *
 * Every page.tsx under src/app/(customer)/ must export either:
 *   - `generateMetadata` (async function)
 *   - `export const metadata`
 *
 * Pages may opt out by adding the comment `// @seo-allow-default` anywhere in
 * the file (useful for pages that intentionally inherit layout metadata).
 *
 * Severity: warn (not error) so existing pages don't immediately break CI.
 * Upgrade to error once all pages are compliant.
 */

'use strict'

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Customer-facing page.tsx files must export generateMetadata or metadata',
      category: 'SEO Guardrails',
      recommended: false,
    },
    schema: [],
    messages: {
      missingMetadata:
        'Customer-facing page.tsx is missing SEO metadata. Export `generateMetadata` or `export const metadata`. Add `// @seo-allow-default` to opt out intentionally.',
    },
  },

  create(context) {
    // Only applies to page.tsx files under (customer)/
    const filename = context.getFilename()
    if (!filename.includes('(customer)') || !filename.endsWith('page.tsx')) {
      return {}
    }

    return {
      Program(node) {
        const sourceCode = context.getSourceCode()
        const text = sourceCode.getText()

        // Allow opt-out via escape comment
        if (text.includes('// @seo-allow-default')) {
          return
        }

        const body = node.body

        const hasMetadata = body.some((stmt) => {
          // export async function generateMetadata
          // export function generateMetadata
          if (
            stmt.type === 'ExportNamedDeclaration' &&
            stmt.declaration?.type === 'FunctionDeclaration' &&
            stmt.declaration?.id?.name === 'generateMetadata'
          ) {
            return true
          }

          // export const metadata = ...
          if (
            stmt.type === 'ExportNamedDeclaration' &&
            stmt.declaration?.type === 'VariableDeclaration'
          ) {
            return stmt.declaration.declarations.some(
              (decl) => decl.id?.type === 'Identifier' && decl.id.name === 'metadata',
            )
          }

          return false
        })

        if (!hasMetadata) {
          context.report({
            node,
            messageId: 'missingMetadata',
          })
        }
      },
    }
  },
}
