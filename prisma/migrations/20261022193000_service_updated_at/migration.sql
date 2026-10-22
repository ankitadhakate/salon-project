-- Each service remembers when its price was last saved.
ALTER TABLE "Service" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
