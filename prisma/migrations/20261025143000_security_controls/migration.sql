-- Rate limits, stat dedupe, listing audit, and claim email proofs.

CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimit_bucket_subjectHash_windowStart_key" ON "RateLimit"("bucket", "subjectHash", "windowStart");
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

CREATE TABLE "StatDedup" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatDedup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StatDedup_salonId_day_kind_visitorHash_key" ON "StatDedup"("salonId", "day", "kind", "visitorHash");
CREATE INDEX "StatDedup_createdAt_idx" ON "StatDedup"("createdAt");

ALTER TABLE "StatDedup" ADD CONSTRAINT "StatDedup_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ListingAudit" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "actorId" TEXT,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL DEFAULT '',
    "newValue" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingAudit_salonId_createdAt_idx" ON "ListingAudit"("salonId", "createdAt");

ALTER TABLE "ListingAudit" ADD CONSTRAINT "ListingAudit_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClaimInvite" ADD COLUMN "revokedAt" TIMESTAMP(3);

CREATE TABLE "ClaimProof" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimProof_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClaimProof_tokenHash_key" ON "ClaimProof"("tokenHash");
CREATE INDEX "ClaimProof_inviteId_idx" ON "ClaimProof"("inviteId");

ALTER TABLE "ClaimProof" ADD CONSTRAINT "ClaimProof_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "ClaimInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
