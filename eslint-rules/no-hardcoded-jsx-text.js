/**
 * ESLint rule: no-hardcoded-jsx-text (local-i18n)
 *
 * Warns when visible UI text is hardcoded in JSX instead of coming from the
 * i18n layer (src/lib/i18n/*, or a per-page content map like for-shops-content.ts).
 * `npm run lint:i18n` only checks key parity of the namespace files — it cannot
 * see literals written directly into JSX. This rule closes that gap.
 *
 * Reported:
 *   - JSX text children:            <h3>Without pundo</h3>
 *   - string literals as children:  <p>{'Hello'}</p>, <p>{`Hello`}</p>
 *   - user-visible string attributes: aria-label="5 stars", alt, title, placeholder, …
 *   - static first argument of toast helpers: showToast('Deleted', 'success'), toast(`Saved`)
 *     (function names configurable via the `toastFunctions` option, default showToast + toast;
 *     also matches member calls like toast.success('x'))
 *
 * Not reported: text without at least two consecutive letters (numbers, prices,
 * symbols, emoji, "·", "→", "€0*"), URL examples, and allowlisted brand names (pundo,
 * Google Maps, WhatsApp, …; extend via the `allow` option).
 *
 * Legitimate exceptions (brand/product names in decorative mocks, language
 * endonyms like "Ελληνικά"): add `@i18n-allow-literal` on the line directly above
 * (// @i18n-allow-literal in attribute lists, {/* @i18n-allow-literal *\/} in JSX children)
 * or on the same line.
 *
 * Severity: warn — no build break, but visible in IDE and CI lint output.
 */

'use strict'

const VISIBLE_ATTRIBUTES = new Set([
  'alt',
  'title',
  'placeholder',
  'label',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
])

// Brand / product names that are never translated
const DEFAULT_ALLOW = [
  'pundo', 'Pundo', 'naidivse', 'Naidivse',
  'Google Maps', 'Apple Maps', 'Waze', 'WhatsApp', 'Facebook', 'Instagram', 'TikTok', 'Viber', 'Telegram',
]

const DEFAULT_TOAST_FUNCTIONS = ['showToast', 'toast']

const MARKER = '@i18n-allow-literal'

// At least two consecutive letters in any script (Latin, Greek, Cyrillic, Arabic, Hebrew, …)
const HAS_WORD = /\p{L}{2,}/u

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hardcoded visible text in JSX — use the i18n layer (t(lang), content maps). Add @i18n-allow-literal above the line for brand names or decorative exceptions.',
      category: 'i18n Guardrails',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: { type: 'array', items: { type: 'string' } },
          toastFunctions: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcodedText:
        'Hardcoded UI text "{{text}}" — move it into the i18n layer (src/lib/i18n/* or the page content map) so all 6 languages are served. Add @i18n-allow-literal on the line above for brand names or decorative exceptions.',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allow = new Set([...DEFAULT_ALLOW, ...(options.allow || [])])
    const toastFunctions = new Set(options.toastFunctions || DEFAULT_TOAST_FUNCTIONS)
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const lines = sourceCode.lines

    function isAllowedText(raw) {
      let text = raw.replace(/\s+/g, ' ').trim()
      if (/^(https?:\/\/|www\.|mailto:)/i.test(text)) return true // URL placeholders/examples
      for (const word of allow) text = text.split(word).join(' ')
      return !HAS_WORD.test(text)
    }

    function hasMarker(node) {
      const line = node.loc.start.line // 1-based
      const same = lines[line - 1] || ''
      const prev = line > 1 ? lines[line - 2] : ''
      return same.includes(MARKER) || prev.includes(MARKER)
    }

    function report(node, raw) {
      if (isAllowedText(raw) || hasMarker(node)) return
      const text = raw.replace(/\s+/g, ' ').trim()
      context.report({
        node,
        messageId: 'hardcodedText',
        data: { text: text.length > 40 ? `${text.slice(0, 37)}…` : text },
      })
    }

    function staticString(expr) {
      if (!expr) return null
      if (expr.type === 'Literal' && typeof expr.value === 'string') return expr.value
      if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
        return expr.quasis.map((q) => q.value.cooked).join('')
      }
      return null
    }

    function calleeName(callee) {
      if (callee.type === 'Identifier') return callee.name
      if (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier') {
        return callee.object.name // toast.success('x') -> toast
      }
      return null
    }

    return {
      CallExpression(node) {
        const name = calleeName(node.callee)
        if (!name || !toastFunctions.has(name)) return
        const first = node.arguments[0]
        const value = staticString(first)
        if (value !== null) report(first, value)
      },

      JSXText(node) {
        report(node, node.value)
      },

      JSXExpressionContainer(node) {
        // Only string literals placed directly as children: <p>{'Hello'}</p>
        if (node.parent && node.parent.type === 'JSXAttribute') return
        const value = staticString(node.expression)
        if (value !== null) report(node, value)
      },

      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || !VISIBLE_ATTRIBUTES.has(node.name.name)) return
        if (!node.value) return
        const value =
          node.value.type === 'Literal'
            ? typeof node.value.value === 'string' ? node.value.value : null
            : node.value.type === 'JSXExpressionContainer'
              ? staticString(node.value.expression)
              : null
        if (value !== null) report(node, value)
      },
    }
  },
}
