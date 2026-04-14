FROM node:20-alpine AS builder
WORKDIR /app

# Next.js evaluiert next.config.ts' rewrites() zum BUILD-Zeitpunkt und
# bakes die Destinations ein. BACKEND_URL muss daher VOR "npm run build"
# gesetzt sein, sonst faellt rewrites() auf den Fallback http://localhost:8000
# zurueck und der Production-Container kann den Backend nicht erreichen.
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
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
