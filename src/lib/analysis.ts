import type { Exercise, MenuTemplate, MuscleGroup, WorkoutSession } from '../types'

export interface ExerciseHistoryPoint {
  date: string
  maxWeight: number
  totalVolume: number
  totalReps: number
}

export function getSessionVolume(session: WorkoutSession): number {
  return session.exerciseLogs.reduce(
    (total, log) => total + log.sets.reduce((logTotal, set) => logTotal + set.weight * set.reps, 0),
    0,
  )
}

export function getExerciseHistory(sessions: WorkoutSession[], exerciseId: string): ExerciseHistoryPoint[] {
  return sessions
    .filter((s) => s.exerciseLogs.some((l) => l.exerciseId === exerciseId))
    .map((s) => {
      const log = s.exerciseLogs.find((l) => l.exerciseId === exerciseId)!
      const maxWeight = Math.max(...log.sets.map((set) => set.weight))
      const totalVolume = log.sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
      const totalReps = log.sets.reduce((sum, set) => sum + set.reps, 0)
      return { date: s.date, maxWeight, totalVolume, totalReps }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export type SuggestionLevel = 'increase' | 'hold' | 'deload' | 'no-data'

export interface TargetSuggestion {
  exerciseId: string
  level: SuggestionLevel
  message: string
  suggestedWeight?: number
}

const WEIGHT_STEP = 2.5

export function suggestNextTarget(
  sessions: WorkoutSession[],
  exercise: Exercise,
  targetReps = 10,
): TargetSuggestion {
  const history = getExerciseHistory(sessions, exercise.id)
  if (history.length === 0) {
    return { exerciseId: exercise.id, level: 'no-data', message: 'No records yet. Log your first session to get started.' }
  }

  const last = history[history.length - 1]
  const lastSession = sessions
    .filter((s) => s.date === last.date)
    .flatMap((s) => s.exerciseLogs)
    .find((l) => l.exerciseId === exercise.id)!

  const allSetsHitTarget = lastSession.sets.length > 0 && lastSession.sets.every((set) => set.reps >= targetReps)
  const avgReps = lastSession.sets.reduce((sum, s) => sum + s.reps, 0) / lastSession.sets.length

  if (allSetsHitTarget) {
    return {
      exerciseId: exercise.id,
      level: 'increase',
      suggestedWeight: last.maxWeight + WEIGHT_STEP,
      message: `Every set hit the ${targetReps}-rep target last time. Try ${last.maxWeight + WEIGHT_STEP}kg next session.`,
    }
  }

  if (avgReps < targetReps * 0.6) {
    return {
      exerciseId: exercise.id,
      level: 'deload',
      suggestedWeight: Math.max(0, last.maxWeight - WEIGHT_STEP),
      message: `Reps fell well short of the target last time (avg ${avgReps.toFixed(1)}). Drop to ${Math.max(0, last.maxWeight - WEIGHT_STEP)}kg and focus on form.`,
    }
  }

  return {
    exerciseId: exercise.id,
    level: 'hold',
    suggestedWeight: last.maxWeight,
    message: `Stay at ${last.maxWeight}kg and aim to hit the ${targetReps}-rep target.`,
  }
}

export interface StagnationInfo {
  exerciseId: string
  isStagnant: boolean
  sessionsChecked: number
}

export function detectStagnation(sessions: WorkoutSession[], exerciseId: string, lookback = 3): StagnationInfo {
  const history = getExerciseHistory(sessions, exerciseId)
  const recent = history.slice(-lookback)
  if (recent.length < lookback) {
    return { exerciseId, isStagnant: false, sessionsChecked: recent.length }
  }
  const weights = recent.map((h) => h.maxWeight)
  const isStagnant = weights.every((w) => w === weights[0])
  return { exerciseId, isStagnant, sessionsChecked: recent.length }
}

export interface MuscleGroupVolume {
  muscleGroup: MuscleGroup
  volume: number
  setCount: number
}

export function getMuscleGroupVolumes(
  sessions: WorkoutSession[],
  exercises: Exercise[],
  sinceDate: string,
): MuscleGroupVolume[] {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const totals = new Map<MuscleGroup, { volume: number; setCount: number }>()

  for (const session of sessions) {
    if (session.date < sinceDate) continue
    for (const log of session.exerciseLogs) {
      const exercise = exerciseById.get(log.exerciseId)
      if (!exercise) continue
      const current = totals.get(exercise.muscleGroup) ?? { volume: 0, setCount: 0 }
      current.volume += log.sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      current.setCount += log.sets.length
      totals.set(exercise.muscleGroup, current)
    }
  }

  return Array.from(totals.entries()).map(([muscleGroup, v]) => ({ muscleGroup, ...v }))
}

export interface GapAnalysis {
  neglectedMuscleGroups: MuscleGroup[]
  neglectedMenuExercises: { exerciseId: string; exerciseName: string; daysSinceLast: number | null }[]
  stagnantExercises: string[]
}

const ALL_MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core']

export function analyzeGaps(
  sessions: WorkoutSession[],
  exercises: Exercise[],
  menus: MenuTemplate[],
  today: string,
  windowDays = 7,
): GapAnalysis {
  const since = shiftDate(today, -windowDays)
  const volumes = getMuscleGroupVolumes(sessions, exercises, since)
  const trainedGroups = new Set(volumes.filter((v) => v.setCount > 0).map((v) => v.muscleGroup))
  const groupsInMenus = new Set(
    menus.flatMap((m) => m.exercises.map((me) => exercises.find((e) => e.id === me.exerciseId)?.muscleGroup)),
  )
  const relevantGroups = groupsInMenus.size > 0 ? Array.from(groupsInMenus).filter((g): g is MuscleGroup => !!g) : ALL_MUSCLE_GROUPS
  const neglectedMuscleGroups = relevantGroups.filter((g) => !trainedGroups.has(g))

  const menuExerciseIds = new Set(menus.flatMap((m) => m.exercises.map((e) => e.exerciseId)))
  const neglectedMenuExercises = Array.from(menuExerciseIds).map((exerciseId) => {
    const exercise = exercises.find((e) => e.id === exerciseId)
    const history = getExerciseHistory(sessions, exerciseId)
    const lastDate = history.length > 0 ? history[history.length - 1].date : null
    const daysSinceLast = lastDate ? daysBetween(lastDate, today) : null
    return { exerciseId, exerciseName: exercise?.name ?? 'Unknown Exercise', daysSinceLast }
  }).filter((e) => e.daysSinceLast === null || e.daysSinceLast > windowDays)

  const stagnantExercises = exercises
    .filter((e) => detectStagnation(sessions, e.id).isStagnant)
    .map((e) => e.id)

  return { neglectedMuscleGroups, neglectedMenuExercises, stagnantExercises }
}

export interface ExerciseTrend {
  exerciseId: string
  name: string
  muscleGroup: MuscleGroup
  latest: number
  previous: number
  changePct: number
}

export function getExerciseTrends(sessions: WorkoutSession[], exercises: Exercise[]): ExerciseTrend[] {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const trends: ExerciseTrend[] = []
  for (const exercise of exercises) {
    const history = getExerciseHistory(sessions, exercise.id)
    if (history.length < 2) continue
    const latest = history[history.length - 1]
    const previous = history[history.length - 2]
    if (previous.maxWeight === 0) continue
    const changePct = ((latest.maxWeight - previous.maxWeight) / previous.maxWeight) * 100
    trends.push({
      exerciseId: exercise.id,
      name: exerciseById.get(exercise.id)?.name ?? exercise.id,
      muscleGroup: exercise.muscleGroup,
      latest: latest.maxWeight,
      previous: previous.maxWeight,
      changePct,
    })
  }
  return trends.sort((a, b) => b.changePct - a.changePct)
}

export interface WeeklyStats {
  volume: number
  sessionCount: number
  streakDays: number
}

export function getWeeklyStats(sessions: WorkoutSession[], today: string, windowDays = 7): WeeklyStats {
  const since = shiftDate(today, -windowDays)
  const inWindow = sessions.filter((s) => s.date >= since && s.date <= today)
  const volume = inWindow.reduce((sum, session) => sum + getSessionVolume(session), 0)
  const trainedDates = new Set(sessions.map((s) => s.date))
  let streakDays = 0
  let cursor = today
  while (trainedDates.has(cursor)) {
    streakDays += 1
    cursor = shiftDate(cursor, -1)
  }
  return { volume, sessionCount: inWindow.length, streakDays }
}

export function getRecentExerciseIds(sessions: WorkoutSession[], limit = 8): string[] {
  const seen = new Map<string, string>()
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  for (const session of sorted) {
    for (const log of session.exerciseLogs) {
      if (!seen.has(log.exerciseId)) seen.set(log.exerciseId, session.date)
    }
  }
  return Array.from(seen.keys()).slice(0, limit)
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}
