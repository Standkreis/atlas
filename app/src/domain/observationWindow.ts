/** Versioned dataset window. Advance with a coordinated region refresh and app build. */
export const OBSERVATION_WINDOW = { version: 1, firstYear: 2016, lastYear: 2026 } as const
export const OBSERVATION_YEARS = `${OBSERVATION_WINDOW.firstYear},${OBSERVATION_WINDOW.lastYear}`
