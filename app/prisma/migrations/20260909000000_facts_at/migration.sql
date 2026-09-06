-- Handoff 0021 (D1): when the `facts` step last ran for a taxon, and the per-kind extras of a sound Asset (D5).
-- `AssetKind` already carries `sound` since the init migration.
-- AlterTable
ALTER TABLE "Taxon" ADD COLUMN     "factsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "meta" JSONB;
