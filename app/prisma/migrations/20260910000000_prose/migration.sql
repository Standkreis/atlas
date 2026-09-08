-- Handoff 0028: the Steckbrief and Ökologie prose on the taxon, and the GloBI studies behind every edge (0027 F1/F2).
-- Existing edges keep studies {} / real 0 / prose true until the region is refetched (`content --force`).
-- AlterTable
ALTER TABLE "Taxon" ADD COLUMN "prose" JSONB;

-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN "studies" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Interaction" ADD COLUMN "real" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Interaction" ADD COLUMN "prose" BOOLEAN NOT NULL DEFAULT true;
