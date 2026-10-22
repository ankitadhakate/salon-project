-- Listings the team creates can exist before an owner claims them.
ALTER TABLE "Salon" ALTER COLUMN "ownerId" DROP NOT NULL;

-- Daily counts only. No visitor identity.
CREATE TABLE "SalonStat" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "whatsapps" INTEGER NOT NULL DEFAULT 0,
    "directions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalonStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalonStat_salonId_day_key" ON "SalonStat"("salonId", "day");
CREATE INDEX "SalonStat_salonId_idx" ON "SalonStat"("salonId");

ALTER TABLE "SalonStat" ADD CONSTRAINT "SalonStat_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClaimInvite" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClaimInvite_tokenHash_key" ON "ClaimInvite"("tokenHash");
CREATE INDEX "ClaimInvite_salonId_idx" ON "ClaimInvite"("salonId");

ALTER TABLE "ClaimInvite" ADD CONSTRAINT "ClaimInvite_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
