import type { Exercise, MenuTemplate, MuscleGroup, WorkoutSession } from '../types'
import {
  analyzeGaps,
  daysBetween,
  getExerciseHistory,
  getExerciseTrends,
  getRecentExerciseIds,
  getSessionVolume,
  getWeeklyStats,
  shiftDate,
  type ExerciseHistoryPoint,
} from './analysis'

function linearRegression(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n === 0) return 0
  const meanX = points.reduce((a, p) => a + p.x, 0) / n
  const meanY = points.reduce((a, p) => a + p.y, 0) / n
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY)
    den += (p.x - meanX) ** 2
  }
  return den === 0 ? 0 : num / den
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 3) return null
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  if (denX === 0 || denY === 0) return null
  return num / Math.sqrt(denX * denY)
}

// 1. Plateau forecast
export interface PlateauForecast {
  exerciseId: string
  sessionsUntilPlateau: number | null
  message: string
}

export function forecastPlateau(sessions: WorkoutSession[], exercise: Exercise): PlateauForecast {
  const history = getExerciseHistory(sessions, exercise.id).slice(-5)
  if (history.length < 4) {
    return { exerciseId: exercise.id, sessionsUntilPlateau: null, message: 'Not enough data yet' }
  }
  const deltas = history.slice(1).map((h, i) => h.maxWeight - history[i].maxWeight)
  const slope = linearRegression(deltas.map((d, i) => ({ x: i, y: d })))
  const lastDelta = deltas[deltas.length - 1]

  if (lastDelta <= 0) {
    return { exerciseId: exercise.id, sessionsUntilPlateau: 0, message: `${exercise.name}: progress has stalled in the most recent session` }
  }
  if (slope >= 0) {
    return { exerciseId: exercise.id, sessionsUntilPlateau: null, message: `${exercise.name} is progressing steadily` }
  }
  const sessionsUntilZero = Math.ceil(lastDelta / -slope)
  if (sessionsUntilZero <= 5) {
    return {
      exerciseId: exercise.id,
      sessionsUntilPlateau: sessionsUntilZero,
      message: `${exercise.name}: at this rate you'll likely plateau in about ${sessionsUntilZero} more sessions`,
    }
  }
  return { exerciseId: exercise.id, sessionsUntilPlateau: null, message: `${exercise.name} is progressing steadily` }
}

// 2. Stagnation root-cause diagnosis
export interface StagnationDiagnosis {
  exerciseId: string
  cause: 'volume' | 'reps' | 'frequency' | 'unknown'
  message: string
}

function average(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length
}

function averageGapDays(points: ExerciseHistoryPoint[]): number | null {
  if (points.length < 2) return null
  let total = 0
  for (let i = 1; i < points.length; i++) total += daysBetween(points[i - 1].date, points[i].date)
  return total / (points.length - 1)
}

export function diagnoseStagnation(sessions: WorkoutSession[], exercise: Exercise, lookback = 3): StagnationDiagnosis | null {
  const history = getExerciseHistory(sessions, exercise.id)
  const recent = history.slice(-lookback)
  if (recent.length < lookback || !recent.every((h) => h.maxWeight === recent[0].maxWeight)) return null

  const prior = history.slice(-lookback * 2, -lookback)
  if (prior.length < 2) {
    return { exerciseId: exercise.id, cause: 'unknown', message: `${exercise.name} has been stuck at the same weight for ${lookback} sessions in a row` }
  }

  const recentVolume = average(recent.map((h) => h.totalVolume))
  const priorVolume = average(prior.map((h) => h.totalVolume))
  const recentReps = average(recent.map((h) => h.totalReps))
  const priorReps = average(prior.map((h) => h.totalReps))
  const recentGap = averageGapDays(recent)
  const priorGap = averageGapDays(prior)

  if (priorVolume > 0 && recentVolume < priorVolume * 0.85) {
    return {
      exerciseId: exercise.id,
      cause: 'volume',
      message: `${exercise.name}: volume is down ${Math.round((1 - recentVolume / priorVolume) * 100)}% from before — try adding a set`,
    }
  }
  if (priorReps > 0 && recentReps < priorReps * 0.85) {
    return {
      exerciseId: exercise.id,
      cause: 'reps',
      message: `${exercise.name}: reps are dropping off — lower the weight a bit and rebuild your form`,
    }
  }
  if (recentGap != null && priorGap != null && recentGap > priorGap * 1.3) {
    return {
      exerciseId: exercise.id,
      cause: 'frequency',
      message: `${exercise.name}: frequency has dropped (avg ${recentGap.toFixed(1)} days between sessions) — try training it more often`,
    }
  }
  return { exerciseId: exercise.id, cause: 'unknown', message: `${exercise.name} has been stuck at the same weight for ${lookback} sessions — consider a deload` }
}

// 3. Goal ETA projection
export interface GoalETA {
  exerciseId: string
  goalWeight: number
  currentWeight: number
  weeklyRateKg: number | null
  weeksToGoal: number | null
  message: string
}

export function projectGoalETA(sessions: WorkoutSession[], exerciseId: string, exerciseName: string, goalWeight: number): GoalETA {
  const history = getExerciseHistory(sessions, exerciseId)
  const current = history.length > 0 ? history[history.length - 1].maxWeight : 0
  if (history.length < 2) {
    return { exerciseId, goalWeight, currentWeight: current, weeklyRateKg: null, weeksToGoal: null, message: 'Not enough data yet' }
  }
  if (current >= goalWeight) {
    return { exerciseId, goalWeight, currentWeight: current, weeklyRateKg: null, weeksToGoal: 0, message: `Already hit the ${goalWeight}kg goal` }
  }
  const first = history[0]
  const points = history.map((h) => ({ x: daysBetween(first.date, h.date), y: h.maxWeight }))
  const slopePerDay = linearRegression(points)
  const weeklyRateKg = slopePerDay * 7
  if (weeklyRateKg <= 0.01) {
    return { exerciseId, goalWeight, currentWeight: current, weeklyRateKg, weeksToGoal: null, message: 'At the current pace, this goal is not projected to be reached' }
  }
  const weeksToGoal = Math.ceil((goalWeight - current) / weeklyRateKg)
  return {
    exerciseId,
    goalWeight,
    currentWeight: current,
    weeklyRateKg,
    weeksToGoal,
    message: `${exerciseName}: at the current pace (+${weeklyRateKg.toFixed(1)}kg/week) you'll likely hit ${goalWeight}kg in about ${weeksToGoal} weeks`,
  }
}

// 4. Deload plan generator
export function generateDeloadPlan(exerciseIds: string[]) {
  const unique = Array.from(new Set(exerciseIds))
  return {
    name: 'Deload Week',
    exercises: unique.map((id) => ({ exerciseId: id, targetSets: 2, targetReps: 12 })),
  }
}

// 5. Highest-leverage exercise ranking
export interface LeverageRanking {
  exerciseId: string
  name: string
  score: number
  reason: string
}

export function rankLeverage(sessions: WorkoutSession[], exercises: Exercise[], menus: MenuTemplate[], today: string): LeverageRanking[] {
  const gaps = analyzeGaps(sessions, exercises, menus, today)
  const trends = getExerciseTrends(sessions, exercises)
  const trendById = new Map(trends.map((t) => [t.exerciseId, t]))
  const relevant = exercises.filter(
    (e) => menus.some((m) => m.exercises.some((me) => me.exerciseId === e.id)) || sessions.some((s) => s.exerciseLogs.some((l) => l.exerciseId === e.id)),
  )
  const results: LeverageRanking[] = []
  for (const ex of relevant) {
    let score = 0
    const reasons: string[] = []
    if (gaps.neglectedMuscleGroups.includes(ex.muscleGroup)) {
      score += 3
      reasons.push('Neglected muscle group')
    }
    if (gaps.stagnantExercises.includes(ex.id)) {
      score += 2
      reasons.push('Stagnant')
    }
    const t = trendById.get(ex.id)
    if (t && t.changePct < 0) {
      score += 1
      reasons.push('Recent decline')
    }
    if (score > 0) results.push({ exerciseId: ex.id, name: ex.name, score, reason: reasons.join(' · ') })
  }
  return results.sort((a, b) => b.score - a.score)
}

// 6. Rest-day readiness
export interface RestReadiness {
  muscleGroup: MuscleGroup
  daysSinceTrained: number | null
  recoveryDays: number
  ready: boolean
}

const RECOVERY_DAYS: Record<MuscleGroup, number> = { Chest: 2, Back: 2, Shoulders: 2, Legs: 3, Arms: 1, Core: 1, Other: 1 }
const TRACKED_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core']

export function getRestReadiness(sessions: WorkoutSession[], exercises: Exercise[], today: string): RestReadiness[] {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  return TRACKED_GROUPS.map((group) => {
    let lastDate: string | null = null
    for (const s of sessions) {
      for (const log of s.exerciseLogs) {
        if (exerciseById.get(log.exerciseId)?.muscleGroup === group && (!lastDate || s.date > lastDate)) {
          lastDate = s.date
        }
      }
    }
    const daysSinceTrained = lastDate ? daysBetween(lastDate, today) : null
    const recoveryDays = RECOVERY_DAYS[group]
    return { muscleGroup: group, daysSinceTrained, recoveryDays, ready: daysSinceTrained === null || daysSinceTrained >= recoveryDays }
  })
}

// 7. Periodization phase-shift suggestion
export interface PhaseSuggestion {
  phase: 'strength' | 'hypertrophy' | 'endurance' | 'unknown'
  weeksInPhase: number
  suggestSwitch: boolean
  message: string
}

export function suggestPhaseShift(sessions: WorkoutSession[], today: string): PhaseSuggestion {
  const since = shiftDate(today, -28)
  const recentSessions = sessions.filter((s) => s.date >= since)
  const allReps = recentSessions.flatMap((s) => s.exerciseLogs.flatMap((l) => l.sets.map((set) => set.reps)))
  if (allReps.length < 10) return { phase: 'unknown', weeksInPhase: 0, suggestSwitch: false, message: 'Not enough data yet' }

  const avgReps = average(allReps)
  const phase = avgReps <= 6 ? 'strength' : avgReps <= 12 ? 'hypertrophy' : 'endurance'
  const earliest = recentSessions.reduce((min, s) => (s.date < min ? s.date : min), today)
  const weeksInPhase = Math.max(1, Math.round(daysBetween(earliest, today) / 7))
  const suggestSwitch = weeksInPhase >= 4
  const phaseLabel = phase === 'strength' ? 'strength (low reps)' : phase === 'hypertrophy' ? 'hypertrophy (mid reps)' : 'endurance (high reps)'
  return {
    phase,
    weeksInPhase,
    suggestSwitch,
    message: suggestSwitch
      ? `You've been in a ${phaseLabel} phase for about ${weeksInPhase} weeks. Consider switching up your rep range`
      : `Recent training trends toward a ${phaseLabel} phase`,
  }
}

// 8. Weekly narrative report
export function generateWeeklyNarrative(sessions: WorkoutSession[], exercises: Exercise[], today: string): string {
  const thisWeek = getWeeklyStats(sessions, today, 7)
  const since14 = shiftDate(today, -14)
  const since7 = shiftDate(today, -7)
  const lastWeekSessions = sessions.filter((s) => s.date >= since14 && s.date < since7)
  const lastWeekVolume = lastWeekSessions.reduce((sum, session) => sum + getSessionVolume(session), 0)
  const trends = getExerciseTrends(sessions, exercises)
  const best = trends[0]
  const worst = trends[trends.length - 1]

  const parts: string[] = []
  if (lastWeekVolume > 0) {
    const pct = Math.round(((thisWeek.volume - lastWeekVolume) / lastWeekVolume) * 100)
    parts.push(`This week's volume is ${pct >= 0 ? '+' : ''}${pct}% vs last week`)
  } else if (thisWeek.volume > 0) {
    parts.push(`This week's volume is ${Math.round(thisWeek.volume).toLocaleString()}kg`)
  }
  if (best && best.changePct > 0) parts.push(`${best.name} is up sharply`)
  if (worst && worst.changePct < 0 && worst.exerciseId !== best?.exerciseId) parts.push(`${worst.name} is down slightly`)
  if (parts.length === 0) return 'No sessions logged yet this week.'
  return parts.join(', ') + '.'
}

// 9 & 14. Exercise monotony + substitution suggestion
export function countConsecutiveWeeks(sessions: WorkoutSession[], exerciseId: string, today: string): number {
  let weeks = 0
  let cursor = today
  for (let i = 0; i < 26; i++) {
    const weekStart = shiftDate(cursor, -6)
    const hasLog = sessions.some((s) => s.date >= weekStart && s.date <= cursor && s.exerciseLogs.some((l) => l.exerciseId === exerciseId))
    if (!hasLog) break
    weeks += 1
    cursor = shiftDate(weekStart, -1)
  }
  return weeks
}

export interface SubstitutionSuggestion {
  exerciseId: string
  exerciseName: string
  substituteId: string
  substituteName: string
  weeksStreak: number
}

export function suggestSubstitution(sessions: WorkoutSession[], exercises: Exercise[], exerciseId: string, today: string, minWeeks = 4): SubstitutionSuggestion | null {
  const weeks = countConsecutiveWeeks(sessions, exerciseId, today)
  if (weeks < minWeeks) return null
  const exercise = exercises.find((e) => e.id === exerciseId)
  if (!exercise) return null
  const recentIds = new Set(getRecentExerciseIds(sessions, 6))
  const candidate = exercises.find((e) => e.muscleGroup === exercise.muscleGroup && e.id !== exerciseId && !recentIds.has(e.id))
  if (!candidate) return null
  return { exerciseId, exerciseName: exercise.name, substituteId: candidate.id, substituteName: candidate.name, weeksStreak: weeks }
}

// 10. PR live countdown
export function getPersonalRecord(sessions: WorkoutSession[], exerciseId: string): number | null {
  const history = getExerciseHistory(sessions, exerciseId)
  if (history.length === 0) return null
  return Math.max(...history.map((h) => h.maxWeight))
}

// 15. Within-session rep decay
export interface RepDecayInfo {
  decayPct: number
  firstReps: number
  lastReps: number
  message: string
}

export function analyzeRepDecay(sessions: WorkoutSession[], exercise: Exercise): RepDecayInfo | null {
  const sorted = [...sessions].filter((s) => s.exerciseLogs.some((l) => l.exerciseId === exercise.id)).sort((a, b) => b.date.localeCompare(a.date))
  const latest = sorted[0]
  if (!latest) return null
  const log = latest.exerciseLogs.find((l) => l.exerciseId === exercise.id)!
  if (log.sets.length < 3) return null
  const firstReps = log.sets[0].reps
  const lastReps = log.sets[log.sets.length - 1].reps
  if (firstReps === 0) return null
  const decayPct = ((firstReps - lastReps) / firstReps) * 100
  if (decayPct < 30) return null
  return {
    decayPct,
    firstReps,
    lastReps,
    message: `Reps dropped ${Math.round(decayPct)}% within the last session (${firstReps} → ${lastReps}). Try longer rests or a lighter weight`,
  }
}

// 16. Weekly distribution skew
export interface DistributionSkew {
  topWeekdays: number[]
  sharePct: number
  isSkewed: boolean
}

export function detectDistributionSkew(sessions: WorkoutSession[], today: string, weeks = 4): DistributionSkew {
  const since = shiftDate(today, -weeks * 7)
  const recent = sessions.filter((s) => s.date >= since)
  const volumeByWeekday = new Array(7).fill(0)
  for (const s of recent) {
    const wd = new Date(s.date).getDay()
    volumeByWeekday[wd] += getSessionVolume(s)
  }
  const total = volumeByWeekday.reduce((a, b) => a + b, 0)
  if (total === 0 || recent.length < 4) return { topWeekdays: [], sharePct: 0, isSkewed: false }
  const indices = volumeByWeekday.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
  const top2 = indices.slice(0, 2)
  const sharePct = (top2.reduce((a, b) => a + b.v, 0) / total) * 100
  return { topWeekdays: top2.map((t) => t.i), sharePct, isSkewed: sharePct >= 70 }
}

// 17. Adherence drop-off pattern
export interface AdherenceDropoff {
  menuId: string
  menuName: string
  weekday: number
  scheduledCount: number
}

export function detectAdherenceDropoff(sessions: WorkoutSession[], menus: MenuTemplate[], today: string, weeks = 4): AdherenceDropoff[] {
  const since = shiftDate(today, -weeks * 7)
  const loggedDates = new Set(sessions.map((s) => s.date))
  const results: AdherenceDropoff[] = []
  for (const menu of menus) {
    for (const weekday of menu.weekdays) {
      let scheduled = 0
      let logged = 0
      let cursor = since
      while (cursor <= today) {
        if (new Date(cursor).getDay() === weekday) {
          scheduled += 1
          if (loggedDates.has(cursor)) logged += 1
        }
        cursor = shiftDate(cursor, 1)
      }
      if (scheduled >= 3 && logged === 0) {
        results.push({ menuId: menu.id, menuName: menu.name, weekday, scheduledCount: scheduled })
      }
    }
  }
  return results
}

// 18. Lifetime neglected muscle audit
export function lifetimeNeglectedMuscleGroups(sessions: WorkoutSession[], exercises: Exercise[]): MuscleGroup[] {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const trained = new Set<MuscleGroup>()
  for (const s of sessions) {
    for (const l of s.exerciseLogs) {
      const ex = exerciseById.get(l.exerciseId)
      if (ex) trained.add(ex.muscleGroup)
    }
  }
  return TRACKED_GROUPS.filter((g) => !trained.has(g))
}

// 19. Cross-exercise correlation
export interface CorrelationResult {
  nameA: string
  nameB: string
  correlation: number
}

function isoWeekKey(date: string): string {
  const d = new Date(date)
  const firstJan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((Math.floor((d.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

export function findCorrelatedExercises(sessions: WorkoutSession[], exercises: Exercise[]): CorrelationResult | null {
  const byExerciseWeek = new Map<string, Map<string, number>>()
  for (const ex of exercises) {
    const history = getExerciseHistory(sessions, ex.id)
    if (history.length < 3) continue
    const weekMap = new Map<string, number>()
    for (const h of history) weekMap.set(isoWeekKey(h.date), Math.max(weekMap.get(isoWeekKey(h.date)) ?? 0, h.maxWeight))
    if (weekMap.size >= 3) byExerciseWeek.set(ex.id, weekMap)
  }
  const ids = Array.from(byExerciseWeek.keys())
  let best: CorrelationResult | null = null
  let bestCorr = 0.6
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = byExerciseWeek.get(ids[i])!
      const b = byExerciseWeek.get(ids[j])!
      const commonWeeks = Array.from(a.keys()).filter((w) => b.has(w))
      if (commonWeeks.length < 3) continue
      const corr = pearson(
        commonWeeks.map((w) => a.get(w)!),
        commonWeeks.map((w) => b.get(w)!),
      )
      if (corr !== null && corr > bestCorr) {
        bestCorr = corr
        const exA = exercises.find((e) => e.id === ids[i])!
        const exB = exercises.find((e) => e.id === ids[j])!
        best = { nameA: exA.name, nameB: exB.name, correlation: corr }
      }
    }
  }
  return best
}

// 20. Relative strength standards
export interface StrengthStandard {
  bodyweightRatio: number
  tier: 'untrained' | 'novice' | 'intermediate' | 'advanced' | 'elite'
  nextTier: string | null
  kgToNextTier: number | null
}

const TIER_LABELS: StrengthStandard['tier'][] = ['novice', 'intermediate', 'advanced', 'elite']
const STRENGTH_STANDARDS: Record<string, [number, number, number, number]> = {
  'bench-press': [0.5, 0.75, 1.25, 1.75],
  squat: [0.75, 1.25, 1.75, 2.5],
  deadlift: [1.0, 1.5, 2.0, 2.75],
}

export function getStrengthStandard(sessions: WorkoutSession[], exerciseId: string, bodyweightKg: number): StrengthStandard | null {
  const table = STRENGTH_STANDARDS[exerciseId]
  if (!table || bodyweightKg <= 0) return null
  const history = getExerciseHistory(sessions, exerciseId)
  if (history.length === 0) return null
  const current = history[history.length - 1].maxWeight
  const ratio = current / bodyweightKg

  let tier: StrengthStandard['tier'] = 'untrained'
  let nextTier: string | null = 'novice'
  let kgToNextTier: number | null = table[0] * bodyweightKg - current
  for (let i = 0; i < table.length; i++) {
    if (ratio >= table[i]) {
      tier = TIER_LABELS[i]
      const nextThreshold = table[i + 1]
      nextTier = TIER_LABELS[i + 1] ?? null
      kgToNextTier = nextThreshold != null ? nextThreshold * bodyweightKg - current : null
    }
  }
  return { bodyweightRatio: ratio, tier, nextTier, kgToNextTier: kgToNextTier != null ? Math.max(0, kgToNextTier) : null }
}

// Count how many sessions in the recent window set a new all-time max for their exercise.
export function countRecentPRs(sessions: WorkoutSession[], exercises: Exercise[], today: string, windowDays = 7): number {
  const since = shiftDate(today, -windowDays)
  let count = 0
  for (const exercise of exercises) {
    let runningMax = -Infinity
    for (const point of getExerciseHistory(sessions, exercise.id)) {
      if (point.maxWeight > runningMax) {
        if (point.date >= since && point.date <= today) count++
        runningMax = point.maxWeight
      }
    }
  }
  return count
}
