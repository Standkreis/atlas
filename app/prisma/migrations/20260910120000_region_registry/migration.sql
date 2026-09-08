-- Issue #16: additive, versioned composite-region registry.
-- Existing Region UUIDs and every relation to them remain untouched.

-- AlterEnum
ALTER TYPE "RegionStatus" ADD VALUE 'unprepared';

-- CreateEnum
CREATE TYPE "RegionRegistrySourceRole" AS ENUM ('regions', 'kreisUnits', 'queryMappings');

-- CreateEnum
CREATE TYPE "RegionAliasKind" AS ENUM ('displayName', 'sourceName', 'sourceUnit', 'state', 'variant');

-- CreateEnum
CREATE TYPE "RegionQueryProvider" AS ENUM ('gbifGadm');

-- CreateEnum
CREATE TYPE "RegionQueryReviewStatus" AS ENUM ('pending', 'verified', 'rejected');

-- AlterTable: nullable identity columns keep every legacy row valid until the reviewed cutover.
ALTER TABLE "Region"
  ALTER COLUMN "gadmGid" DROP NOT NULL,
  ADD COLUMN "canonicalKey" TEXT,
  ADD COLUMN "countryCode" TEXT;

-- CreateTable
CREATE TABLE "RegionRegistryVersion" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "artifactSha256" TEXT NOT NULL,
  "expectedRegions" INTEGER NOT NULL,
  "expectedSourceUnits" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),

  CONSTRAINT "RegionRegistryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionRegistrySource" (
  "id" TEXT NOT NULL,
  "registryVersionId" TEXT NOT NULL,
  "role" "RegionRegistrySourceRole" NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "topicDate" DATE NOT NULL,
  "downloadedAt" TIMESTAMP(3) NOT NULL,
  "sha256" TEXT NOT NULL,
  "licenceId" TEXT NOT NULL,
  "licenceUrl" TEXT,
  "attribution" TEXT NOT NULL,
  "metadata" JSONB,

  CONSTRAINT "RegionRegistrySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionRegistryEntry" (
  "id" TEXT NOT NULL,
  "registryVersionId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "sourceCode" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "stateCode" TEXT NOT NULL,
  "stateName" TEXT NOT NULL,

  CONSTRAINT "RegionRegistryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionRegistryAlias" (
  "id" TEXT NOT NULL,
  "registryEntryId" TEXT NOT NULL,
  "kind" "RegionAliasKind" NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,

  CONSTRAINT "RegionRegistryAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionSourceUnit" (
  "id" TEXT NOT NULL,
  "registryVersionId" TEXT NOT NULL,
  "registryEntryId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "sourceCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,

  CONSTRAINT "RegionSourceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionQueryUnit" (
  "id" TEXT NOT NULL,
  "registryVersionId" TEXT NOT NULL,
  "sourceUnitId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "provider" "RegionQueryProvider" NOT NULL,
  "providerVersion" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "reviewStatus" "RegionQueryReviewStatus" NOT NULL DEFAULT 'pending',
  "reviewedAt" TIMESTAMP(3),
  "evidence" JSONB NOT NULL,

  CONSTRAINT "RegionQueryUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_canonicalKey_key" ON "Region"("canonicalKey");

-- CreateIndex
CREATE INDEX "Region_countryCode_idx" ON "Region"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "RegionRegistryVersion_countryCode_version_key" ON "RegionRegistryVersion"("countryCode", "version");

-- CreateIndex: PostgreSQL partial uniqueness is intentionally expressed in checked-in SQL.
CREATE UNIQUE INDEX "RegionRegistryVersion_one_active_per_country" ON "RegionRegistryVersion"("countryCode") WHERE "active" = true;

-- CreateIndex
CREATE INDEX "RegionRegistryVersion_countryCode_active_idx" ON "RegionRegistryVersion"("countryCode", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RegionRegistrySource_id_registryVersionId_key" ON "RegionRegistrySource"("id", "registryVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionRegistrySource_registryVersionId_role_key" ON "RegionRegistrySource"("registryVersionId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RegionRegistryEntry_id_registryVersionId_key" ON "RegionRegistryEntry"("id", "registryVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionRegistryEntry_registryVersionId_sourceCode_key" ON "RegionRegistryEntry"("registryVersionId", "sourceCode");

-- CreateIndex
CREATE UNIQUE INDEX "RegionRegistryEntry_registryVersionId_regionId_key" ON "RegionRegistryEntry"("registryVersionId", "regionId");

-- CreateIndex
CREATE INDEX "RegionRegistryEntry_sourceId_idx" ON "RegionRegistryEntry"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionRegistryAlias_registryEntryId_normalizedName_key" ON "RegionRegistryAlias"("registryEntryId", "normalizedName");

-- CreateIndex
CREATE INDEX "RegionRegistryAlias_normalizedName_idx" ON "RegionRegistryAlias"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "RegionSourceUnit_id_registryVersionId_key" ON "RegionSourceUnit"("id", "registryVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionSourceUnit_registryVersionId_canonicalKey_key" ON "RegionSourceUnit"("registryVersionId", "canonicalKey");

-- CreateIndex
CREATE UNIQUE INDEX "RegionSourceUnit_registryVersionId_sourceCode_key" ON "RegionSourceUnit"("registryVersionId", "sourceCode");

-- CreateIndex
CREATE INDEX "RegionSourceUnit_registryEntryId_idx" ON "RegionSourceUnit"("registryEntryId");

-- CreateIndex
CREATE INDEX "RegionSourceUnit_sourceId_idx" ON "RegionSourceUnit"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionQueryUnit_registry_provider_key" ON "RegionQueryUnit"("registryVersionId", "provider", "providerVersion", "providerKey");

-- CreateIndex
CREATE INDEX "RegionQueryUnit_sourceUnitId_idx" ON "RegionQueryUnit"("sourceUnitId");

-- CreateIndex
CREATE INDEX "RegionQueryUnit_sourceId_idx" ON "RegionQueryUnit"("sourceId");

-- AddForeignKey: registry history is protected from cascading deletes.
ALTER TABLE "RegionRegistrySource" ADD CONSTRAINT "RegionRegistrySource_registryVersionId_fkey" FOREIGN KEY ("registryVersionId") REFERENCES "RegionRegistryVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionRegistryEntry" ADD CONSTRAINT "RegionRegistryEntry_registryVersionId_fkey" FOREIGN KEY ("registryVersionId") REFERENCES "RegionRegistryVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionRegistryEntry" ADD CONSTRAINT "RegionRegistryEntry_sourceId_registryVersionId_fkey" FOREIGN KEY ("sourceId", "registryVersionId") REFERENCES "RegionRegistrySource"("id", "registryVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionRegistryEntry" ADD CONSTRAINT "RegionRegistryEntry_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionRegistryAlias" ADD CONSTRAINT "RegionRegistryAlias_registryEntryId_fkey" FOREIGN KEY ("registryEntryId") REFERENCES "RegionRegistryEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionSourceUnit" ADD CONSTRAINT "RegionSourceUnit_registryVersionId_fkey" FOREIGN KEY ("registryVersionId") REFERENCES "RegionRegistryVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionSourceUnit" ADD CONSTRAINT "RegionSourceUnit_registryEntryId_registryVersionId_fkey" FOREIGN KEY ("registryEntryId", "registryVersionId") REFERENCES "RegionRegistryEntry"("id", "registryVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionSourceUnit" ADD CONSTRAINT "RegionSourceUnit_sourceId_registryVersionId_fkey" FOREIGN KEY ("sourceId", "registryVersionId") REFERENCES "RegionRegistrySource"("id", "registryVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionQueryUnit" ADD CONSTRAINT "RegionQueryUnit_registryVersionId_fkey" FOREIGN KEY ("registryVersionId") REFERENCES "RegionRegistryVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionQueryUnit" ADD CONSTRAINT "RegionQueryUnit_sourceUnitId_registryVersionId_fkey" FOREIGN KEY ("sourceUnitId", "registryVersionId") REFERENCES "RegionSourceUnit"("id", "registryVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionQueryUnit" ADD CONSTRAINT "RegionQueryUnit_sourceId_registryVersionId_fkey" FOREIGN KEY ("sourceId", "registryVersionId") REFERENCES "RegionRegistrySource"("id", "registryVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;
