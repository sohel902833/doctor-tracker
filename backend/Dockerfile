# syntax=docker/dockerfile:1

# Debian (not Alpine): TypeScript 7's native compiler has no musl build.
ARG NODE_IMAGE=node:22-slim

# ---------- Build: install all deps and compile TypeScript ----------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Runtime: production deps + compiled code + seed data ----------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# Medicine catalog the seed imports on startup.
COPY data ./data

# The official image ships a non-root "node" user.
USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
