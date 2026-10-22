-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "referralCode" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Salon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "areaSlug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT 'UNISEX',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isEarlyPartner" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,
    "startingPrice" INTEGER,
    "searchBlob" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Salon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salonId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Photo_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceInr" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Service_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpeningHour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salonId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "openTime" TEXT NOT NULL DEFAULT '10:00',
    "closeTime" TEXT NOT NULL DEFAULT '20:00',
    CONSTRAINT "OpeningHour_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Locality" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Pune',
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_tokenHash_key" ON "MagicLink"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLink_email_idx" ON "MagicLink"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Salon_ownerId_key" ON "Salon"("ownerId");

-- CreateIndex
CREATE INDEX "Salon_status_areaSlug_idx" ON "Salon"("status", "areaSlug");

-- CreateIndex
CREATE INDEX "Salon_isDemo_idx" ON "Salon"("isDemo");

-- CreateIndex
CREATE UNIQUE INDEX "Salon_areaSlug_slug_key" ON "Salon"("areaSlug", "slug");

-- CreateIndex
CREATE INDEX "Photo_salonId_idx" ON "Photo"("salonId");

-- CreateIndex
CREATE INDEX "Service_salonId_idx" ON "Service"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHour_salonId_dayOfWeek_key" ON "OpeningHour"("salonId", "dayOfWeek");
