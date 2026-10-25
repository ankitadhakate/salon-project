FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate && npx next build

EXPOSE 3847

# Render sets PORT. Migrate on boot. The sample seed does not run when NODE_ENV=production.
CMD ["sh", "scripts/entrypoint.sh"]
