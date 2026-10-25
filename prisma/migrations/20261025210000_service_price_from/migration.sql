-- Custom services can be a starting price, and duration is optional.
ALTER TABLE "Service" ADD COLUMN "priceFrom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ALTER COLUMN "durationMin" DROP NOT NULL;
