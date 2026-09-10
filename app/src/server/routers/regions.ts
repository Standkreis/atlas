import { z } from 'zod'
import { publicProcedure, router } from '../trpc'
import { locateRegion, personalRegions, regionLocationInput, regionSearchInput, searchRegions } from '../regionSearch'
import { resolveRegionIds } from '../regionCompatibility'

export const regionsRouter = router({
  search: publicProcedure.input(regionSearchInput).query(({ ctx, input }) => searchRegions(ctx.db, input)),
  personal: publicProcedure.input(z.object({ recentIds: z.array(z.string().uuid()).max(20).default([]), month: z.number().int().min(1).max(12).optional() }).default({ recentIds: [] }))
    .query(({ ctx, input }) => personalRegions(ctx.db, ctx.identity.id, input.recentIds, input.month ?? new Date().getMonth() + 1)),
  locate: publicProcedure.input(regionLocationInput).query(({ ctx, input }) => locateRegion(ctx.db, input)),
  compatibility: publicProcedure.input(z.object({ regionIds: z.array(z.string().uuid()).max(50) }))
    .query(({ ctx, input }) => resolveRegionIds(ctx.db, input.regionIds)),
})
