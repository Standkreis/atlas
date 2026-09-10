-- Additive preparation only. No gate row is inserted, so legacy application writes stay open.
CREATE TABLE "CatalogueCutoverGate" (
  "countryCode" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'open',
  "targetCatalogueId" TEXT,
  "operationId" TEXT,
  "maintenanceSince" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogueCutoverGate_pkey" PRIMARY KEY ("countryCode"),
  CONSTRAINT "CatalogueCutoverGate_state_check" CHECK ("state" IN ('open', 'maintenance')),
  CONSTRAINT "CatalogueCutoverGate_maintenance_fields_check" CHECK (
    ("state" = 'open' AND "targetCatalogueId" IS NULL AND "operationId" IS NULL AND "maintenanceSince" IS NULL)
    OR
    ("state" = 'maintenance' AND "targetCatalogueId" IS NOT NULL AND "operationId" IS NOT NULL AND "maintenanceSince" IS NOT NULL)
  )
);

CREATE TABLE "CatalogueWriteAdmission" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "identityId" TEXT,
  "detail" JSONB,
  "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogueWriteAdmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatalogueWriteAdmission_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "CatalogueCutoverGate"("countryCode") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CatalogueWriteAdmission_countryCode_admittedAt_idx" ON "CatalogueWriteAdmission"("countryCode", "admittedAt");
