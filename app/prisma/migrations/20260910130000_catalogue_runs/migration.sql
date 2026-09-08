-- Issue #18: resumable, staged nationwide catalogue generation.
-- Candidate data remains separate from live Plausibility/Lookalike rows until audited activation.

CREATE TYPE "CatalogueStatus" AS ENUM ('building', 'partial', 'complete', 'audited', 'active', 'retired');
CREATE TYPE "CatalogueRegionBuildStatus" AS ENUM ('pending', 'running', 'complete', 'failed');
CREATE TYPE "TaxonEnrichmentWorkStatus" AS ENUM ('pending', 'running', 'complete', 'failed');

CREATE TABLE "CatalogueVersion" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "runKey" TEXT NOT NULL,
  "registryVersionId" TEXT NOT NULL,
  "inputFingerprint" TEXT NOT NULL,
  "sourceFingerprint" TEXT NOT NULL,
  "responseFingerprint" TEXT,
  "unionFingerprint" TEXT,
  "plausibleRulesVersion" INTEGER NOT NULL,
  "tileMappingVersion" INTEGER NOT NULL,
  "observationWindowVersion" INTEGER NOT NULL,
  "yearFrom" INTEGER NOT NULL,
  "yearTo" INTEGER NOT NULL,
  "occurrencePredicates" JSONB NOT NULL,
  "status" "CatalogueStatus" NOT NULL DEFAULT 'partial',
  "expectedRegions" INTEGER NOT NULL,
  "completedRegions" INTEGER NOT NULL DEFAULT 0,
  "unionTaxa" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedAt" TIMESTAMP(3),
  "auditedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "executionOwner" TEXT,
  "executionExpiresAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogueVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogueVersion_years_check" CHECK ("yearFrom" > 0 AND "yearTo" >= "yearFrom"),
  CONSTRAINT "CatalogueVersion_counts_check" CHECK ("expectedRegions" > 0 AND "completedRegions" >= 0 AND "completedRegions" <= "expectedRegions" AND "unionTaxa" >= 0),
  CONSTRAINT "CatalogueVersion_execution_check" CHECK (("status" = 'building' AND "executionOwner" IS NOT NULL AND "executionExpiresAt" IS NOT NULL) OR ("status" <> 'building' AND "executionOwner" IS NULL AND "executionExpiresAt" IS NULL)),
  CONSTRAINT "CatalogueVersion_completion_check" CHECK ("status" NOT IN ('complete', 'audited', 'active', 'retired') OR ("completedRegions" = "expectedRegions" AND "generatedAt" IS NOT NULL AND "responseFingerprint" IS NOT NULL AND "unionFingerprint" IS NOT NULL AND "unionTaxa" > 0)),
  CONSTRAINT "CatalogueVersion_activation_check" CHECK ("status" <> 'active' OR ("auditedAt" IS NOT NULL AND "activatedAt" IS NOT NULL))
);

CREATE TABLE "CatalogueRegionBuild" (
  "id" TEXT NOT NULL,
  "catalogueVersionId" TEXT NOT NULL,
  "registryVersionId" TEXT NOT NULL,
  "registryEntryId" TEXT NOT NULL,
  "status" "CatalogueRegionBuildStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  "totalObservations" INTEGER,
  "monthTotals" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "regionSize" INTEGER,
  "perTile" JSONB,
  "rejectedTaxa" JSONB,
  "requestStats" JSONB,
  "responseFingerprint" TEXT,
  "setFingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogueRegionBuild_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogueRegionBuild_attempts_check" CHECK ("attempts" >= 0),
  CONSTRAINT "CatalogueRegionBuild_counts_check" CHECK (("totalObservations" IS NULL OR "totalObservations" >= 0) AND ("regionSize" IS NULL OR "regionSize" >= 0)),
  CONSTRAINT "CatalogueRegionBuild_lease_check" CHECK (("status" = 'running' AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL) OR ("status" <> 'running' AND "leaseOwner" IS NULL AND "leaseExpiresAt" IS NULL)),
  CONSTRAINT "CatalogueRegionBuild_complete_check" CHECK ("status" <> 'complete' OR ("totalObservations" IS NOT NULL AND cardinality("monthTotals") = 12 AND "regionSize" IS NOT NULL AND "perTile" IS NOT NULL AND "rejectedTaxa" IS NOT NULL AND "requestStats" IS NOT NULL AND "responseFingerprint" IS NOT NULL AND "setFingerprint" IS NOT NULL AND "completedAt" IS NOT NULL AND "error" IS NULL)),
  CONSTRAINT "CatalogueRegionBuild_failed_check" CHECK ("status" <> 'failed' OR ("error" IS NOT NULL AND length("error") > 0))
);

CREATE TABLE "CataloguePlausibility" (
  "id" TEXT NOT NULL,
  "regionBuildId" TEXT NOT NULL,
  "taxonId" TEXT NOT NULL,
  "obs" INTEGER NOT NULL,
  "monthShare" INTEGER[] NOT NULL,
  "peak" INTEGER NOT NULL,
  "words" TEXT NOT NULL,
  CONSTRAINT "CataloguePlausibility_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CataloguePlausibility_counts_check" CHECK ("obs" >= 0 AND "peak" >= 0 AND cardinality("monthShare") = 12)
);

CREATE TABLE "CatalogueLookalike" (
  "id" TEXT NOT NULL,
  "regionBuildId" TEXT NOT NULL,
  "taxonId" TEXT NOT NULL,
  "siblingId" TEXT NOT NULL,
  CONSTRAINT "CatalogueLookalike_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogueLookalike_not_self_check" CHECK ("taxonId" <> "siblingId")
);

CREATE TABLE "CatalogueTaxon" (
  "catalogueVersionId" TEXT NOT NULL,
  "taxonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogueTaxon_pkey" PRIMARY KEY ("catalogueVersionId", "taxonId")
);

CREATE TABLE "CatalogueTaxonomyResolution" (
  "catalogueVersionId" TEXT NOT NULL,
  "sourceKey" INTEGER NOT NULL,
  "record" JSONB NOT NULL,
  "recordFingerprint" TEXT NOT NULL,
  "acceptedKey" INTEGER,
  "rejectionReason" TEXT,
  "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogueTaxonomyResolution_pkey" PRIMARY KEY ("catalogueVersionId", "sourceKey"),
  CONSTRAINT "CatalogueTaxonomyResolution_keys_check" CHECK ("sourceKey" > 0 AND ("acceptedKey" IS NULL OR "acceptedKey" > 0)),
  CONSTRAINT "CatalogueTaxonomyResolution_outcome_check" CHECK (("acceptedKey" IS NOT NULL AND "rejectionReason" IS NULL) OR ("acceptedKey" IS NULL AND "rejectionReason" IS NOT NULL AND length("rejectionReason") > 0))
);

CREATE TABLE "TaxonEnrichmentWork" (
  "taxonId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" "TaxonEnrichmentWorkStatus" NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  "resultSummary" JSONB,
  "sourceFingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxonEnrichmentWork_pkey" PRIMARY KEY ("taxonId", "kind", "version"),
  CONSTRAINT "TaxonEnrichmentWork_attempts_check" CHECK ("attempts" >= 0),
  CONSTRAINT "TaxonEnrichmentWork_kind_version_check" CHECK (length("kind") > 0 AND length("version") > 0),
  CONSTRAINT "TaxonEnrichmentWork_lease_check" CHECK (("status" = 'running' AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL) OR ("status" <> 'running' AND "leaseOwner" IS NULL AND "leaseExpiresAt" IS NULL)),
  CONSTRAINT "TaxonEnrichmentWork_complete_check" CHECK ("status" <> 'complete' OR ("completedAt" IS NOT NULL AND "error" IS NULL)),
  CONSTRAINT "TaxonEnrichmentWork_failed_check" CHECK ("status" <> 'failed' OR ("error" IS NOT NULL AND length("error") > 0))
);

CREATE UNIQUE INDEX "CatalogueVersion_countryCode_runKey_key" ON "CatalogueVersion"("countryCode", "runKey");
CREATE UNIQUE INDEX "CatalogueVersion_id_registryVersionId_key" ON "CatalogueVersion"("id", "registryVersionId");
CREATE UNIQUE INDEX "CatalogueVersion_one_active_per_country" ON "CatalogueVersion"("countryCode") WHERE "status" = 'active';
CREATE UNIQUE INDEX "CatalogueVersion_one_unfinished_per_country" ON "CatalogueVersion"("countryCode") WHERE "status" IN ('building', 'partial');
CREATE INDEX "CatalogueVersion_countryCode_status_idx" ON "CatalogueVersion"("countryCode", "status");
CREATE INDEX "CatalogueVersion_registryVersionId_idx" ON "CatalogueVersion"("registryVersionId");
CREATE UNIQUE INDEX "CatalogueRegionBuild_catalogueVersionId_registryEntryId_key" ON "CatalogueRegionBuild"("catalogueVersionId", "registryEntryId");
CREATE INDEX "CatalogueRegionBuild_catalogueVersionId_status_leaseExpiresAt_idx" ON "CatalogueRegionBuild"("catalogueVersionId", "status", "leaseExpiresAt");
CREATE INDEX "CatalogueRegionBuild_registryEntryId_idx" ON "CatalogueRegionBuild"("registryEntryId");
CREATE UNIQUE INDEX "CataloguePlausibility_regionBuildId_taxonId_key" ON "CataloguePlausibility"("regionBuildId", "taxonId");
CREATE INDEX "CataloguePlausibility_taxonId_idx" ON "CataloguePlausibility"("taxonId");
CREATE UNIQUE INDEX "CatalogueLookalike_regionBuildId_taxonId_siblingId_key" ON "CatalogueLookalike"("regionBuildId", "taxonId", "siblingId");
CREATE INDEX "CatalogueLookalike_taxonId_idx" ON "CatalogueLookalike"("taxonId");
CREATE INDEX "CatalogueLookalike_siblingId_idx" ON "CatalogueLookalike"("siblingId");
CREATE INDEX "CatalogueTaxon_taxonId_idx" ON "CatalogueTaxon"("taxonId");
CREATE INDEX "CatalogueTaxonomyResolution_acceptedKey_idx" ON "CatalogueTaxonomyResolution"("acceptedKey");
CREATE INDEX "TaxonEnrichmentWork_kind_version_status_leaseExpiresAt_idx" ON "TaxonEnrichmentWork"("kind", "version", "status", "leaseExpiresAt");

ALTER TABLE "CatalogueVersion" ADD CONSTRAINT "CatalogueVersion_registryVersionId_fkey" FOREIGN KEY ("registryVersionId") REFERENCES "RegionRegistryVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogueRegionBuild" ADD CONSTRAINT "CatalogueRegionBuild_catalogueVersionId_registryVersionId_fkey" FOREIGN KEY ("catalogueVersionId", "registryVersionId") REFERENCES "CatalogueVersion"("id", "registryVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogueRegionBuild" ADD CONSTRAINT "CatalogueRegionBuild_registryEntryId_registryVersionId_fkey" FOREIGN KEY ("registryEntryId", "registryVersionId") REFERENCES "RegionRegistryEntry"("id", "registryVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CataloguePlausibility" ADD CONSTRAINT "CataloguePlausibility_regionBuildId_fkey" FOREIGN KEY ("regionBuildId") REFERENCES "CatalogueRegionBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CataloguePlausibility" ADD CONSTRAINT "CataloguePlausibility_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogueLookalike" ADD CONSTRAINT "CatalogueLookalike_regionBuildId_fkey" FOREIGN KEY ("regionBuildId") REFERENCES "CatalogueRegionBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogueLookalike" ADD CONSTRAINT "CatalogueLookalike_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogueLookalike" ADD CONSTRAINT "CatalogueLookalike_siblingId_fkey" FOREIGN KEY ("siblingId") REFERENCES "Taxon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogueLookalike" ADD CONSTRAINT "CatalogueLookalike_member_fkey" FOREIGN KEY ("regionBuildId", "taxonId") REFERENCES "CataloguePlausibility"("regionBuildId", "taxonId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogueLookalike" ADD CONSTRAINT "CatalogueLookalike_sibling_member_fkey" FOREIGN KEY ("regionBuildId", "siblingId") REFERENCES "CataloguePlausibility"("regionBuildId", "taxonId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogueTaxon" ADD CONSTRAINT "CatalogueTaxon_catalogueVersionId_fkey" FOREIGN KEY ("catalogueVersionId") REFERENCES "CatalogueVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogueTaxon" ADD CONSTRAINT "CatalogueTaxon_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogueTaxonomyResolution" ADD CONSTRAINT "CatalogueTaxonomyResolution_catalogueVersionId_fkey" FOREIGN KEY ("catalogueVersionId") REFERENCES "CatalogueVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxonEnrichmentWork" ADD CONSTRAINT "TaxonEnrichmentWork_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
