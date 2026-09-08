import type { PrismaClient } from '../../src/generated/prisma/client'
import { parseProseForRegion, type Prose } from '../../src/server/prose'

/** One atomic JSON path write preserves another region when content jobs finish together. */
export async function storeRegionalProse(db: Pick<PrismaClient, '$executeRaw'>, taxonId: string, regionId: string, prose: Prose) {
  if (!parseProseForRegion({ version: 1, regions: { [regionId]: prose } }, regionId)) throw new Error('Prose did not pass the publication gate')
  const stored = JSON.stringify(prose)
  return db.$executeRaw`UPDATE "Taxon" SET prose = jsonb_set(
    CASE WHEN prose->>'version' = '1' THEN prose ELSE '{"version":1,"regions":{}}'::jsonb END,
    ARRAY['regions', ${regionId}]::text[], ${stored}::jsonb, true
  ) WHERE id = ${taxonId}`
}
