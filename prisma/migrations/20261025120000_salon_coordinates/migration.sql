-- Map pin for a salon. Null until the owner drops one.
ALTER TABLE "Salon" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Salon" ADD COLUMN "longitude" DOUBLE PRECISION;
