const config = {
  plugins: {
    // Tailwind v4 generates @layer blocks which are only supported in Chrome 99+
    // (Tizen/Samsung TV uses Chromium ~56–94). This plugin polyfills @layer at
    // build time by rewriting the CSS to flat rules with adjusted specificity —
    // no runtime cost, no code changes needed elsewhere.
    "@tailwindcss/postcss": {},
    // Tailwind v4 uses nested @media inside rules; unnest before cascade-layers
    // so the polyfill can correctly wrap responsive variants in @media queries.
    "postcss-nesting": {},
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;
