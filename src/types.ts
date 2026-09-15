export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Legs' | 'Arms' | 'Core' | 'Other'

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Other'] as const satisfies readonly MuscleGroup[]
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  isCustom?: boolean
}

export interface SetEntry {
  weight: number
  reps: number
}

export interface ExerciseLog {
  exerciseId: string
  sets: SetEntry[]
}

export interface WorkoutSession {
  id: string
  date: string // yyyy-MM-dd
  exerciseLogs: ExerciseLog[]
  memo?: string
}

export interface MenuExercise {
  exerciseId: string
  targetSets: number
  targetReps: number
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export interface MenuTemplate {
  id: string
  name: string
  weekdays: number[] // 0=Sun ... 6=Sat
  exercises: MenuExercise[]
}

export interface AppData {
  exercises: Exercise[]
  sessions: WorkoutSession[]
  menus: MenuTemplate[]
}
