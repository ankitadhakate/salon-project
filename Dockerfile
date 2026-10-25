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
# Next inlines NEXT_PUBLIC_* when the variable is set. Production passes
# https://letstrim.com. An empty arg is unset so next build does not freeze "".
ARG NEXT_PUBLIC_APP_URL
RUN if [ -z "${NEXT_PUBLIC_APP_URL}" ]; then unset NEXT_PUBLIC_APP_URL; fi \
  && npx prisma generate && npx next build

EXPOSE 3847

# Web only. Cloud Run sets PORT. Job command: sh scripts/migrate-job.sh
# Do not migrate or seed here. Several replicas would race.
CMD ["npm", "start"]
