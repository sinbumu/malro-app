FROM node:20-bookworm-slim AS base

WORKDIR /app

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack disable && npm install -g pnpm@10.22.0

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY artifacts ./artifacts

RUN pnpm install --frozen-lockfile
ENV DATABASE_URL="file:/app/data/sqlite/malro.db"
RUN pnpm --filter server exec prisma generate
RUN pnpm --filter server exec prisma db push
RUN pnpm --filter server build

EXPOSE 4000

CMD ["sh", "-c", "pnpm --filter server exec prisma db push && pnpm --filter server start"]

