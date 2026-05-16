/**
 * ESLint rule: require-page-metadata
 *
 * Every page.tsx under src/app/(customer)/ must export either:
 *   - `generateMetadata` (async function)
 *   - `export const metadata`
 *
 * Additionally (AC-43, F6400): static `metadata` objects must include
 * `description` and `openGraph.images` — unless the page is whitelisted
 * with `// @seo-allow-default`.
 *
 * Pages may opt out by adding the comment `// @seo-allow-default` anywhere in
 * the file (useful for pages that intentionally inherit layout metadata).
 *
 * Note on generateMetadata: we cannot statically verify the return value of
 * an async function. The description/OG check is advisory (warn level) and
 * applies only to static `export const metadata = { ... }` declarations.
 * Dynamic pages should use `buildCompleteOpenGraph` — verified by code review
 * and the OG completeness audit check.
 *
 * Severity: warn (not error) — migration phase. Escalate to error after
 * all pages adopt buildCompleteOpenGraph (post-F6400).
 */

'use strict'

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Customer-facing page.tsx files must export generateMetadata or metadata with description and openGraph.images',
      category: 'SEO Guardrails',
      recommended: false,
    },
    schema: [],
    messages: {
      missingMetadata:
        'Customer-facing page.tsx is missing SEO metadata. Export `generateMetadata` or `export const metadata`. Add `// @seo-allow-default` to opt out intentionally.',
      missingDescription:
        'Static `metadata` object is missing `description`. Add a description or use `buildCompleteOpenGraph`. Add `// @seo-allow-default` to opt out.',
      missingOgImages:
        'Static `metadata` object is missing `openGraph.images`. Add OG images or use `buildCompleteOpenGraph`. Add `// @seo-allow-default` to opt out.',
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

        let hasMetadata = false
        let metadataNode = null

        for (const stmt of body) {
          // export async function generateMetadata
          // export function generateMetadata
          if (
            stmt.type === 'ExportNamedDeclaration' &&
            stmt.declaration?.type === 'FunctionDeclaration' &&
            stmt.declaration?.id?.name === 'generateMetadata'
          ) {
            hasMetadata = true
            break
          }

          // export const metadata = ...
          if (
            stmt.type === 'ExportNamedDeclaration' &&
            stmt.declaration?.type === 'VariableDeclaration'
          ) {
            const decl = stmt.declaration.declarations.find(
              (d) => d.id?.type === 'Identifier' && d.id.name === 'metadata',
            )
            if (decl) {
              hasMetadata = true
              metadataNode = decl.init // the value (ObjectExpression)
              break
            }
          }
        }

        if (!hasMetadata) {
          context.report({
            node,
            messageId: 'missingMetadata',
          })
          return
        }

        // AC-43: For static metadata objects, check description and openGraph.images
        if (metadataNode && metadataNode.type === 'ObjectExpression') {
          const properties = metadataNode.properties

          const hasDescription = properties.some(
            (p) =>
              p.type === 'Property' &&
              p.key &&
              (p.key.type === 'Identifier' ? p.key.name === 'description' : p.key.value === 'description'),
          )

          if (!hasDescription) {
            context.report({
              node: metadataNode,
              messageId: 'missingDescription',
            })
          }

          const ogProp = properties.find(
            (p) =>
              p.type === 'Property' &&
              p.key &&
              (p.key.type === 'Identifier' ? p.key.name === 'openGraph' : p.key.value === 'openGraph'),
          )

          if (ogProp && ogProp.type === 'Property' && ogProp.value.type === 'ObjectExpression') {
            const ogProps = ogProp.value.properties
            const hasImages = ogProps.some(
              (p) =>
                p.type === 'Property' &&
                p.key &&
                (p.key.type === 'Identifier' ? p.key.name === 'images' : p.key.value === 'images'),
            )
            if (!hasImages) {
              context.report({
                node: ogProp.value,
                messageId: 'missingOgImages',
              })
            }
          }
        }
      },
    }
  },
}
