export type MuscleGroup = '胸' | '背中' | '肩' | '脚' | '腕' | '腹筋' | 'その他'

export const MUSCLE_GROUPS = ['胸', '背中', '肩', '脚', '腕', '腹筋', 'その他'] as const satisfies readonly MuscleGroup[]
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

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

export interface MenuTemplate {
  id: string
  name: string
  weekdays: number[] // 0=日 ... 6=土
  exercises: MenuExercise[]
}

export interface AppData {
  exercises: Exercise[]
  sessions: WorkoutSession[]
  menus: MenuTemplate[]
}
