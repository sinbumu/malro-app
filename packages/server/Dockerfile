FROM node:20-alpine AS base

WORKDIR /app

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY artifacts ./artifacts

RUN pnpm install --frozen-lockfile
ENV DATABASE_URL="file:/app/data/sqlite/malro.db"
RUN pnpm --filter server exec prisma generate
RUN pnpm --filter server build

EXPOSE 4000

CMD ["pnpm", "--filter", "server", "start"]

