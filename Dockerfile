FROM node:20-alpine AS builder
RUN apk -U upgrade
WORKDIR /app

# Next.js evaluiert next.config.ts' rewrites() zum BUILD-Zeitpunkt und
# bakes die Destinations ein. BACKEND_URL muss daher VOR "npm run build"
# gesetzt sein, sonst faellt rewrites() auf den Fallback http://localhost:8000
# zurueck und der Production-Container kann den Backend nicht erreichen.
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL

# NEXT_PUBLIC_PLAUSIBLE_DOMAIN ist das site-identifier-Attribut im
# Plausible-Dashboard (https://plausible.pundo.cy/pundo.cy). Next.js baked
# NEXT_PUBLIC_* env-vars zur Build-Zeit in den Client-Bundle ein — zur
# Laufzeit gesetzte env-vars wirken nicht. Leer lassen in Dev/Test, dann
# wird der Plausible-<Script>-Block gar nicht erst gerendert.
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=pundo.cy
ENV NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN

# Cloudflare Turnstile Site Key — public (steht ohnehin im Client-Bundle).
# Muss zur Build-Zeit verfügbar sein, damit Next.js ihn in TurnstileWidget.tsx
# einbaked. Default ist der echte Prod-Key (gleiches Muster wie PLAUSIBLE_DOMAIN).
ARG NEXT_PUBLIC_TURNSTILE_SITEKEY=0x4AAAAAADFKByTcndwlx0Ek
ENV NEXT_PUBLIC_TURNSTILE_SITEKEY=$NEXT_PUBLIC_TURNSTILE_SITEKEY

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
RUN apk -U upgrade && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
WORKDIR /app
ENV NODE_ENV=production

# Non-root user (Next.js standard pattern)
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 --ingroup nodejs nextjs

# Standalone-Output inkl. aller Laufzeit-Abhaengigkeiten
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
