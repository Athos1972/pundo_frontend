import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  shopAdminBoundaryRule,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Isolated git worktrees created by Claude Code — never lint these
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
