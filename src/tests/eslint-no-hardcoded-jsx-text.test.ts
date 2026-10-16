// @vitest-environment node
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import tsParser from '@typescript-eslint/parser'
import rule from '../../eslint-rules/no-hardcoded-jsx-text.js'

RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

const err = [{ messageId: 'hardcodedText' }]

tester.run('no-hardcoded-jsx-text', rule, {
  valid: [
    { code: 'const a = <h3>{content.pain_label}</h3>' },
    { code: 'const a = <div>€0*</div>' },
    { code: 'const a = <span>· 21 {labels.reviews}</span>' },
    { code: 'const a = <span>→ 5 ★★★★★ 4.8</span>' },
    { code: 'const a = <span>pundo</span>' },
    { code: 'const a = <a>Google Maps</a>' },
    { code: 'const a = <div aria-label={tr.close} />' },
    { code: 'const a = <input placeholder="https://..." />' },
    { code: 'const a = <div className="text-sm uppercase" data-testid="stats-strip" />' },
    {
      code: `const a = (
        <ul>
          {/* @i18n-allow-literal */}
          <li>Ελληνικά</li>
        </ul>
      )`,
    },
    {
      code: `const a = (
        <button
          // @i18n-allow-literal
          aria-label="Samsung"
        />
      )`,
    },
    { code: 'const a = <div aria-label="Samsung" /> // @i18n-allow-literal' },
    { code: 'const a = <div>hello</div>', options: [{ allow: ['hello'] }] },
    // toast helpers: translated / dynamic arguments are fine
    { code: "showToast(tr.api_key_deleted, 'success')" },
    { code: 'showToast(`Deleted ${n}`, "success")' },
    { code: "toast(message)" },
    { code: "showToast('', 'success')" },
    { code: "showToast('42', 'success')" },
    { code: "otherFn('Deleted')" },
    { code: "showToast('Deleted', 'success') // @i18n-allow-literal" },
    { code: "showToast(\n// @i18n-allow-literal\n'Deleted')" },
    { code: "notify('Deleted')", options: [{ toastFunctions: ['showToast'] }] },
    { code: "showToast('Deleted')", options: [{ toastFunctions: ['notify'] }] },
  ],
  invalid: [
    { code: 'const a = <h3>Without pundo</h3>', errors: err },
    { code: 'const a = <p>{"From registration to live"}</p>', errors: err },
    { code: 'const a = <p>{`Hello`}</p>', errors: err },
    { code: 'const a = <div aria-label="5 stars" role="img" />', errors: err },
    { code: 'const a = <img alt="Shop photo" src="x" />', errors: err },
    { code: 'const a = <input placeholder={"Search"} />', errors: err },
    { code: 'const a = <h2>Etwas ist schiefgelaufen</h2>', errors: err },
    { code: 'const a = <span>Ελληνικά</span>', errors: err },
    { code: "showToast('Deleted', 'success')", errors: err },
    { code: 'showToast(`Archived`, "success")', errors: err },
    { code: "toast('Saved')", errors: err },
    { code: "toast.success('Saved')", errors: err },
    { code: "notify('Deleted')", options: [{ toastFunctions: ['notify'] }], errors: err },
  ],
})
