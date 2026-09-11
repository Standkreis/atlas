-- The existing composite indexes start with taxonId/sourceId. These additional
-- indexes bound the other FK lookups during Region/Taxon deletion and recovery.
CREATE INDEX "Lookalike_regionId_idx" ON "Lookalike"("regionId");
CREATE INDEX "Lookalike_siblingId_idx" ON "Lookalike"("siblingId");
CREATE INDEX "Interaction_targetId_idx" ON "Interaction"("targetId");
