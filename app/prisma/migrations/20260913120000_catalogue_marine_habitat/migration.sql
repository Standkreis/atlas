-- Additive only: existing catalogues keep habitatRulesVersion=0 and their original membership.
ALTER TABLE "CatalogueVersion" ADD COLUMN "habitatRulesVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CatalogueVersion" ADD COLUMN "habitatSource" JSONB;
ALTER TABLE "CatalogueRegionBuild" ADD COLUMN "habitatSummary" JSONB;

CREATE TABLE "CatalogueHabitatBatch" (
  "catalogueVersionId" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "names" TEXT[] NOT NULL,
  "record" JSONB NOT NULL,
  "recordFingerprint" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogueHabitatBatch_pkey" PRIMARY KEY ("catalogueVersionId", "requestFingerprint"),
  CONSTRAINT "CatalogueHabitatBatch_catalogueVersionId_fkey" FOREIGN KEY ("catalogueVersionId") REFERENCES "CatalogueVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CatalogueHabitatBatch_names_bounded" CHECK (cardinality("names") BETWEEN 1 AND 50)
);
CREATE INDEX "CatalogueHabitatBatch_names_idx" ON "CatalogueHabitatBatch" USING GIN ("names");
