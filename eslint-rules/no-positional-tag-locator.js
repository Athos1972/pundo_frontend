/**
 * ESLint rule: no-positional-tag-locator (local-e2e)  — B8950-016 T4 (Meta-Test B16)
 *
 * Forbids `page.locator('<tag>').first() / .last() / .nth(n)` for generic tags (form, button, input, select,
 * textarea, table, tr, li, a). Which element is "the first form/button on the page" depends on DOM order, so a
 * second form added elsewhere on the page silently re-targets the test (N7600: AC2b used `page.locator('form').last()`
 * and went red when the contact page got a second form).
 *
 * Use `getByTestId`, `getByRole(..., { name })` or `getByLabel` instead. Scoped locators
 * (`dialog.locator('input').first()`) are not flagged: the scope is the anchor.
 * Opt-out with a reason: `// eslint-disable-next-line local-e2e/no-positional-tag-locator -- <reason>`.
 */

'use strict'

const TAGS = new Set(['form', 'button', 'input', 'select', 'textarea', 'table', 'tr', 'li', 'a'])
const POSITIONAL = new Set(['first', 'last', 'nth'])

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Journeys must not pick page-level elements by tag and position.',
      recommended: false,
    },
    schema: [],
    messages: {
      positional:
        "`page.locator('{{tag}}').{{method}}()` depends on DOM order. Use getByTestId / getByRole(..., { name }) / getByLabel, or scope the locator to a unique container.",
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return
        if (!POSITIONAL.has(callee.property.name)) return
        const receiver = callee.object
        if (receiver.type !== 'CallExpression') return
        const inner = receiver.callee
        if (inner.type !== 'MemberExpression' || inner.property.type !== 'Identifier') return
        if (inner.property.name !== 'locator') return
        // only the page itself: `page.locator(...)` / `this.page.locator(...)`
        const root = inner.object
        const isPage =
          (root.type === 'Identifier' && /^page$|Page$/.test(root.name)) ||
          (root.type === 'MemberExpression' && root.property.type === 'Identifier' && root.property.name === 'page')
        if (!isPage) return
        const arg = receiver.arguments[0]
        if (!arg || arg.type !== 'Literal' || typeof arg.value !== 'string') return
        if (!TAGS.has(arg.value.trim())) return
        context.report({
          node,
          messageId: 'positional',
          data: { tag: arg.value.trim(), method: callee.property.name },
        })
      },
    }
  },
}
