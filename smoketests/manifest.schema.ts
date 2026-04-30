import { z } from 'zod'

// ---------------------------------------------------------------------------
// Assert schemas — discriminated union on `type`
// ---------------------------------------------------------------------------

const StatusAssertSchema = z.object({
  type: z.literal('status'),
  expected: z.number().int().min(100).max(599),
})

const SelectorVisibleAssertSchema = z.object({
  type: z.literal('selector-visible'),
  selector: z.string().min(1),
})

const TextFromTranslationsAssertSchema = z.object({
  type: z.literal('text-from-translations'),
  key: z.string().min(1),
})

const HtmlAttributeAssertSchema = z.object({
  type: z.literal('html-attribute'),
  selector: z.string().min(1),
  attribute: z.string().min(1),
  expected: z.string(),
})

const RedirectToAssertSchema = z.object({
  type: z.literal('redirect-to'),
  'location-contains': z.string().min(1),
})

const NoConsoleErrorsAssertSchema = z.object({
  type: z.literal('no-console-errors'),
})

const MdxRenderedAssertSchema = z.object({
  type: z.literal('mdx-rendered'),
})

const SelectorCountMinAssertSchema = z.object({
  type: z.literal('selector-count-min'),
  selector: z.string().min(1),
  min: z.number().int().min(1),
})

const TextNotPresentAssertSchema = z.object({
  type: z.literal('text-not-present'),
  text: z.string().min(1),
})

const LoginSuccessAssertSchema = z.object({
  type: z.literal('login-success'),
  'user-env': z.string().min(1),
  'password-env': z.string().min(1),
})

export const AssertSchema = z.discriminatedUnion('type', [
  StatusAssertSchema,
  SelectorVisibleAssertSchema,
  TextFromTranslationsAssertSchema,
  HtmlAttributeAssertSchema,
  RedirectToAssertSchema,
  NoConsoleErrorsAssertSchema,
  MdxRenderedAssertSchema,
  SelectorCountMinAssertSchema,
  TextNotPresentAssertSchema,
  LoginSuccessAssertSchema,
])

export type Assert = z.infer<typeof AssertSchema>

// ---------------------------------------------------------------------------
// Check schema
// ---------------------------------------------------------------------------

export const CheckSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Check id must be lowercase alphanumeric with hyphens'),
  phase: z.enum(['anonymous', 'authenticated', 'negative-auth']),
  path: z.string().optional(),
  per_language: z.boolean().default(false),
  languages: z.array(z.enum(['en', 'de', 'el', 'ru', 'ar', 'he'])).optional(),
  asserts: z.array(AssertSchema).min(1, 'At least one assert required'),
  timeout_ms: z.number().int().positive().default(10_000),
  retries: z.number().int().min(0).default(1),
  priority: z.enum(['P0', 'P1', 'P2']).default('P1'),
  resolve_first_item: z.boolean().optional(),
  resolve_first_item_selector: z.string().optional(),
  fresh_session: z.boolean().optional(),
  skip: z.boolean().optional(),
})

export type Check = z.infer<typeof CheckSchema>

// ---------------------------------------------------------------------------
// Brand schema
// ---------------------------------------------------------------------------

export const BrandSchema = z.object({
  id: z.string().min(1),
  base_url: z.string().url('base_url must be a valid URL'),
})

export type Brand = z.infer<typeof BrandSchema>

// ---------------------------------------------------------------------------
// Root manifest schema
// ---------------------------------------------------------------------------

export const ManifestSchema = z.object({
  version: z.literal(1),
  last_updated: z.string().min(1),
  last_updated_by: z.string().min(1),
  brands: z.array(BrandSchema).min(1),
  languages: z.array(z.enum(['en', 'de', 'el', 'ru', 'ar', 'he'])).min(1),
  checks: z.array(CheckSchema).min(1),
})

export type Manifest = z.infer<typeof ManifestSchema>
