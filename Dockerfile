# CV-piloten production image (Node server, not static).
# The bundled server (esbuild --packages=external) imports some packages that
# live in devDependencies (e.g. vite), so the runtime image installs ALL
# dependencies, not just prod ones. This keeps startup reliable.
FROM node:22-slim AS base
ENV NODE_ENV=production
WORKDIR /app
RUN npm install -g pnpm@10.4.1

# Build stage: full install + build.
FROM base AS build
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runtime stage: full deps (incl. dev) so all imported packages resolve.
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts
EXPOSE 3000
# Run idempotent migrations, then start the server.
CMD ["sh", "-c", "node scripts/migrate.mjs && node dist/index.js"]
