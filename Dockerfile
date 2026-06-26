# CV-piloten production image (Node server, not static).
FROM node:22-slim AS base
ENV NODE_ENV=production
WORKDIR /app
RUN npm install -g pnpm@10.4.1

# Install deps (incl. dev for build) using the lockfile.
FROM base AS build
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runtime image: copy built app + production deps.
FROM base AS runtime
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts
EXPOSE 3000
# Run idempotent migrations, then start the server.
CMD ["sh", "-c", "node scripts/migrate.mjs && node dist/index.js"]
