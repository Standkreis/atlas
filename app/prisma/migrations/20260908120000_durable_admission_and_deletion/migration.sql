ALTER TABLE "Asset" ADD COLUMN "byteSize" INTEGER NOT NULL DEFAULT 8388608;
CREATE TABLE "QuotaBucket" ("key" TEXT PRIMARY KEY, "value" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "QuotaBucket_expiresAt_idx" ON "QuotaBucket" ("expiresAt");
CREATE TABLE "ScanWork" ("key" TEXT PRIMARY KEY, "photoId" TEXT NOT NULL REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE, "identityId" TEXT NOT NULL, "token" TEXT NOT NULL, "leaseUntil" TIMESTAMP(3) NOT NULL, "result" JSONB);
CREATE INDEX "ScanWork_leaseUntil_idx" ON "ScanWork" ("leaseUntil");
CREATE INDEX "ScanWork_identityId_leaseUntil_idx" ON "ScanWork" ("identityId", "leaseUntil");
CREATE TABLE "PhotoDeletion" ("assetId" TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "PhotoDeletion_createdAt_idx" ON "PhotoDeletion" ("createdAt");
