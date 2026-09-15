export interface RegressionResult {
  exerciseId: string
  sessions: number
  slopeKgPerWeek: number
  rSquared: number
  pValue: number
  stdErr: number
  significant: boolean
}

export interface ForecastResult {
  exerciseId: string
  rSquared: number
  predictions: { weeksAhead: number; predictedWeight: number; lowerBound: number; upperBound: number }[]
}

export interface CorrelationPair {
  exerciseA: string
  exerciseB: string
  correlation: number
  pValue: number
  weeks: number
}

async function callApi<T>(path: string, accessToken: string): Promise<T | null> {
  try {
    const res = await fetch(path, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function getRegression(exerciseId: string, accessToken: string) {
  return callApi<RegressionResult>(`/api/analytics/regression?exercise_id=${encodeURIComponent(exerciseId)}`, accessToken)
}

export function getForecast(exerciseId: string, accessToken: string, weeksAhead = 4) {
  return callApi<ForecastResult>(
    `/api/analytics/forecast?exercise_id=${encodeURIComponent(exerciseId)}&weeks_ahead=${weeksAhead}`,
    accessToken,
  )
}

export function getCorrelations(accessToken: string) {
  return callApi<{ pairs: CorrelationPair[] }>('/api/analytics/correlations', accessToken)
}
