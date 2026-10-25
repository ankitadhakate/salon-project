-- Appointment requests and WhatsApp shares, plus directory filter indexes.
ALTER TABLE "SalonStat" ADD COLUMN "appointments" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SalonStat" ADD COLUMN "shares" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Salon_status_isDemo_citySlug_areaSlug_startingPrice_idx" ON "Salon"("status", "isDemo", "citySlug", "areaSlug", "startingPrice");
CREATE INDEX "Salon_latitude_longitude_idx" ON "Salon"("latitude", "longitude");
