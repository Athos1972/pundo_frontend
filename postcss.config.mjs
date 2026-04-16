const config = {
  plugins: {
    // Tailwind v4 generates @layer blocks which are only supported in Chrome 99+
    // (Tizen/Samsung TV uses Chromium ~56–94). This plugin polyfills @layer at
    // build time by rewriting the CSS to flat rules with adjusted specificity —
    // no runtime cost, no code changes needed elsewhere.
    "@tailwindcss/postcss": {},
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;
