-- Existing single-image assets remain their taxon's lead. The check keeps gallery order representable by construction.
ALTER TABLE "Asset"
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "Asset_position_nonnegative" CHECK ("position" >= 0);

CREATE INDEX "Asset_taxonId_position_idx" ON "Asset"("taxonId", "position");
