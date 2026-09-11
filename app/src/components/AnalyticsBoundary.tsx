import { AnalyticsClient } from './Analytics'

type AnalyticsEnvironment = {
  VERCEL?: string
  VERCEL_ENV?: string
  VERCEL_TARGET_ENV?: string
}

/** Only the Vercel production context may render the client-side SDK boundary. */
export function isProductionAnalyticsEnvironment(env: AnalyticsEnvironment): boolean {
  return env.VERCEL === '1'
    && env.VERCEL_ENV === 'production'
    && (env.VERCEL_TARGET_ENV === undefined || env.VERCEL_TARGET_ENV === 'production')
}

export function AnalyticsBoundary() {
  const environment = {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_TARGET_ENV: process.env.VERCEL_TARGET_ENV,
  }
  return isProductionAnalyticsEnvironment(environment) ? <AnalyticsClient /> : null
}
