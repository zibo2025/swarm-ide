FROM oven/bun:1 AS base
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy optional directories if they exist
RUN mkdir -p ./public ./skills
COPY --from=builder /app/skills/ ./skills/

EXPOSE 3017
CMD ["bun", "server.js"]
