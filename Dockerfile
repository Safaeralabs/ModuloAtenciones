# ─── Etapa 1: build del frontend + deps del backend ─────────────
FROM node:20-bookworm AS builder
WORKDIR /app

# Herramientas para compilar better-sqlite3 (modulo nativo).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Dependencias del frontend (incluye dev: vite) y build.
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# Dependencias del backend (compila better-sqlite3 para linux).
COPY server ./server
RUN cd server && npm install --omit=dev

# ─── Etapa 2: imagen de runtime ─────────────────────────────────
FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=4000
ENV TZ=America/Bogota
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 4000
CMD ["node", "server/index.js"]
