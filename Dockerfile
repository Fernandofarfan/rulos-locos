# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (incl. dev) for building
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

# Copy sources and compile TypeScript + Prisma client
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build:ts

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production && npx prisma generate

# Compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Bind to all interfaces so the container is reachable
ENV HOST=0.0.0.0
ENV PORT=3001

CMD ["node", "dist/server.js"]
