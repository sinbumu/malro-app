FROM node:20-alpine

WORKDIR /app

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY artifacts ./artifacts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3000"]

