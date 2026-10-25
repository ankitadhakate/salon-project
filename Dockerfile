FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# prisma generate evaluates env() and does not connect. Real URLs come from the host at runtime.
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ARG DIRECT_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npx prisma generate && npx next build

EXPOSE 3847

# Web only: next start. Cloud Run Job command: sh scripts/migrate-job.sh
# A single-instance host (Render, docker compose) runs the migrate job first. See DEPLOY.md.
CMD ["sh", "scripts/entrypoint.sh"]
