import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const requirePageMetadata = require("./eslint-rules/require-page-metadata.js");
const noInlineStyle = require("./eslint-rules/no-inline-style.js");
const noHardcodedJsxText = require("./eslint-rules/no-hardcoded-jsx-text.js");

// ─── Shop-Admin Clean Boundary ────────────────────────────────────────────────
// shop-admin code must not import from customer-facing modules.
// This ensures the shop-admin can be extracted into a separate repo in 2-3 days.
const SHOP_ADMIN_FILES = [
  "src/app/(shop-admin)/**",
  "src/components/shop-admin/**",
  "src/lib/shop-admin*",
  "src/types/shop-admin*",
];

const shopAdminBoundaryRule = {
  files: SHOP_ADMIN_FILES,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "**/components/map/**",
              "**/components/product/**",
              "**/components/search/**",
              "**/components/shop/**",
              "**/components/reviews/**",
            ],
            message:
              "Shop-admin components must only import from src/components/ui/. Customer-facing components are not allowed here (Clean Boundary rule).",
          },
          {
            group: ["**/lib/api"],
            message:
              "Shop-admin must use src/lib/shop-admin-api.ts, not src/lib/api.ts (Clean Boundary rule).",
          },
          {
            group: ["**/types/api"],
            message:
              "Shop-admin must use src/types/shop-admin.ts, not src/types/api.ts (Clean Boundary rule).",
          },
        ],
      },
    ],
  },
};

// ─── SEO Guardrail — require-page-metadata ────────────────────────────────────
// Every (customer)/**/page.tsx must export generateMetadata or metadata.
// Severity: warn so existing pages don't break CI immediately.
const seoMetadataRule = {
  files: ["src/app/(customer)/**/page.tsx"],
  plugins: {
    "local-seo": {
      rules: {
        "require-page-metadata": requirePageMetadata,
      },
    },
  },
  rules: {
    "local-seo/require-page-metadata": "warn",
  },
};

// ─── CSP Guardrail — no-inline-style ─────────────────────────────────────────
// Warn on style={{…}} in TSX files. Use Tailwind classes instead.
// Exceptions: add // @csp-allow-inline-style on the line above the style prop
// (e.g. Leaflet MapContainer, dynamic calculated widths, blur placeholders).
const cspInlineStyleRule = {
  files: ["src/**/*.tsx"],
  plugins: {
    "local-csp": {
      rules: {
        "no-inline-style": noInlineStyle,
      },
    },
  },
  rules: {
    "local-csp/no-inline-style": "warn",
  },
};

// ─── i18n Guardrail — no-hardcoded-jsx-text ──────────────────────────────────
// Warn on visible text hardcoded in JSX (text children, aria-label/alt/title/
// placeholder). `npm run lint:i18n` only checks key parity of src/lib/i18n/* and
// cannot see these. Every UI string must serve all 6 languages.
// Exceptions (brand names in decorative mocks, language endonyms): add
// // @i18n-allow-literal on the line above (or {/* @i18n-allow-literal */} in JSX children).
// Also flags static first arguments of showToast()/toast() (B5900-020).
const i18nHardcodedTextRule = {
  files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
  ignores: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/tests/**"],
  plugins: {
    "local-i18n": {
      rules: {
        "no-hardcoded-jsx-text": noHardcodedJsxText,
      },
    },
  },
  rules: {
    "local-i18n/no-hardcoded-jsx-text": "warn",
  },
};

// ─── Unused vars: ignore _-prefixed identifiers (standard TS convention) ──────
// Preserve rule defaults: vars/args/ignoreRestSiblings are kept at defaults;
// only add _-ignore patterns so prefixed identifiers stop being flagged.
const unusedVarsRule = {
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
    }],
  },
}

// ─── Test files: relax image rules (next/image mocks use <img> intentionally) ─
const testFilesRule = {
  files: ['src/tests/**', 'src/**/*.test.{ts,tsx}', 'e2e/**'],
  rules: {
    '@next/next/no-img-element': 'off',
    'jsx-a11y/alt-text': 'off',
  },
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  shopAdminBoundaryRule,
  seoMetadataRule,
  cspInlineStyleRule,
  i18nHardcodedTextRule,
  unusedVarsRule,
  testFilesRule,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Isolated git worktrees created by Claude Code — never lint these
    ".claude/worktrees/**",
    // Generated coverage reports
    "coverage/**",
    // E2E-Coverage (docs/e2e-testing.md "Coverage"): eigener Build und Berichte, generiert
    ".next-cov/**",
    "coverage-e2e/**",
  ]),
]);

export default eslintConfig;
