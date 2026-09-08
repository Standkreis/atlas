ALTER TABLE "CatalogueRegionBuild" ADD COLUMN "nowCounts" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "Region" ADD COLUMN "pickerSummary" JSONB;

-- Compatibility with the existing picker while catalogue activation and UI migration are staged.
-- This aggregation runs during migration/publication, never in a request.
CREATE FUNCTION refresh_region_picker_summary(target_id TEXT DEFAULT NULL) RETURNS VOID LANGUAGE SQL AS $$
  UPDATE "Region" r SET "pickerSummary" = (
    SELECT jsonb_build_object(
      'version', 1, 'refreshedAt', CURRENT_TIMESTAMP,
      'setSize', count(*),
      'content', count(*) FILTER (WHERE t."contentAt" IS NOT NULL),
      'introEn', count(*) FILTER (WHERE t.intro->>'lang' = 'en'),
      'noGermanName', count(*) FILTER (WHERE t."contentAt" IS NOT NULL AND NOT coalesce(jsonb_typeof(t."commonNames"->'de') = 'string', false)),
      'nowCounts', (SELECT jsonb_agg(n ORDER BY month) FROM (
        SELECT month, count(p2.id) FILTER (WHERE p2.peak > 0 AND p2."monthShare"[month] >= p2.peak * 0.25) AS n
        FROM generate_series(1, 12) month LEFT JOIN "Plausibility" p2 ON p2."regionId" = r.id GROUP BY month
      ) months)
    ) FROM "Plausibility" p JOIN "Taxon" t ON t.id = p."taxonId" WHERE p."regionId" = r.id
  ) WHERE r.status <> 'unprepared' AND (target_id IS NULL OR r.id = target_id);
$$;

SELECT refresh_region_picker_summary();
