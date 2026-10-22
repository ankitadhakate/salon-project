FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./dev.db"
ENV AUTH_SECRET="build-time-placeholder-not-a-real-secret"
ENV NEXT_PUBLIC_APP_URL="http://127.0.0.1:3847"

RUN npx prisma generate \
  && npx prisma migrate deploy \
  && npx next build

EXPOSE 3847

CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p 3847"]
