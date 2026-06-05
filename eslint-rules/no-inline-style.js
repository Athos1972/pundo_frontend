/**
 * ESLint rule: no-inline-style (local-csp)
 *
 * Warns when a JSX element uses style={{…}} (inline style attribute).
 * Inline styles can't be covered by nonces/hashes in a strict CSP — use
 * Tailwind classes instead wherever possible.
 *
 * Legitimate exceptions (Leaflet MapContainer, dynamic calculated values):
 * Add `// @csp-allow-inline-style` on the line directly above the style prop.
 *
 * Severity: warn — no build break, but visible in IDE and CI lint output.
 */

'use strict'

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Avoid inline style={{…}} — use Tailwind classes. Add // @csp-allow-inline-style above the line for dynamic/Leaflet exceptions.',
      category: 'CSP Guardrails',
      recommended: false,
    },
    schema: [],
    messages: {
      noInlineStyle:
        'Inline style (style={{…}}) violates CSP best-practice. Use Tailwind classes or add @csp-allow-inline-style on the line above (// @csp-allow-inline-style in attribute lists, {/* @csp-allow-inline-style */} in JSX children) for dynamic values (e.g. Leaflet, calculated widths).',
    },
  },

  create(context) {
    return {
      JSXAttribute(node) {
        // Only target the `style` prop with an expression value
        if (
          node.name.type !== 'JSXIdentifier' ||
          node.name.name !== 'style' ||
          !node.value ||
          node.value.type !== 'JSXExpressionContainer'
        ) {
          return
        }

        const sourceCode = context.getSourceCode()
        const lines = sourceCode.lines

        // Check if the line directly above contains the opt-out marker.
        // Supports both JS line comments (// @csp-allow-inline-style) in attribute lists
        // and JSX block comments ({/* @csp-allow-inline-style */}) above elements.
        const nodeLine = node.loc.start.line // 1-based
        const prevLine = nodeLine > 1 ? lines[nodeLine - 2] : '' // 0-based array
        if (prevLine && prevLine.includes('@csp-allow-inline-style')) {
          return
        }

        context.report({
          node,
          messageId: 'noInlineStyle',
        })
      },
    }
  },
}
