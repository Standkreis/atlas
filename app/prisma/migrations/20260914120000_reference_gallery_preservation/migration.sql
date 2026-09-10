CREATE TABLE "ReferenceGalleryReceipt" (
    "catalogueVersionId" TEXT NOT NULL,
    "taxonId" TEXT NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "evidenceFingerprint" TEXT NOT NULL,
    "resultSnapshot" JSONB NOT NULL,
    "resultFingerprint" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferenceGalleryReceipt_pkey" PRIMARY KEY ("catalogueVersionId", "taxonId"),
    CONSTRAINT "ReferenceGalleryReceipt_fingerprints_check" CHECK ("sourceFingerprint" ~ '^[0-9a-f]{64}$' AND "evidenceFingerprint" ~ '^[0-9a-f]{64}$' AND "resultFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "ReferenceGalleryReceipt_reviewer_check" CHECK (length(btrim("reviewer")) > 0)
);

CREATE TABLE "ReferenceAssetVisibility" (
    "assetId" TEXT NOT NULL,
    "catalogueVersionId" TEXT NOT NULL,
    "taxonId" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "targetPosition" INTEGER,
    "hiddenReason" TEXT,
    "correctedLicenceUrl" TEXT,
    "sourceAssetFingerprint" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "evidenceFingerprint" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferenceAssetVisibility_pkey" PRIMARY KEY ("assetId"),
    CONSTRAINT "ReferenceAssetVisibility_decision_check" CHECK (("eligible" AND "targetPosition" IS NOT NULL AND "targetPosition" BETWEEN 0 AND 11 AND "hiddenReason" IS NULL) OR (NOT "eligible" AND "targetPosition" IS NULL AND "hiddenReason" IS NOT NULL AND length(btrim("hiddenReason")) > 0)),
    CONSTRAINT "ReferenceAssetVisibility_correction_check" CHECK ("eligible" OR "correctedLicenceUrl" IS NULL),
    CONSTRAINT "ReferenceAssetVisibility_fingerprints_check" CHECK ("sourceAssetFingerprint" ~ '^[0-9a-f]{64}$' AND "evidenceFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "ReferenceAssetVisibility_reviewer_check" CHECK (length(btrim("reviewer")) > 0)
);

CREATE INDEX "ReferenceGalleryReceipt_taxonId_idx" ON "ReferenceGalleryReceipt"("taxonId");
CREATE UNIQUE INDEX "ReferenceAssetVisibility_catalogueVersionId_taxonId_targetPosition_key" ON "ReferenceAssetVisibility"("catalogueVersionId", "taxonId", "targetPosition");
CREATE INDEX "ReferenceAssetVisibility_taxonId_idx" ON "ReferenceAssetVisibility"("taxonId");

ALTER TABLE "ReferenceGalleryReceipt" ADD CONSTRAINT "ReferenceGalleryReceipt_catalogueVersionId_fkey" FOREIGN KEY ("catalogueVersionId") REFERENCES "CatalogueVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferenceGalleryReceipt" ADD CONSTRAINT "ReferenceGalleryReceipt_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferenceAssetVisibility" ADD CONSTRAINT "ReferenceAssetVisibility_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferenceAssetVisibility" ADD CONSTRAINT "ReferenceAssetVisibility_receipt_fkey" FOREIGN KEY ("catalogueVersionId", "taxonId") REFERENCES "ReferenceGalleryReceipt"("catalogueVersionId", "taxonId") ON DELETE RESTRICT ON UPDATE CASCADE;
