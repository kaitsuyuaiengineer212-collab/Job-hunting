import { createContext, useContext, type ReactNode } from 'react'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { DEFAULT_EXERCISES } from './lib/defaultExercises'
import type { Exercise, MenuTemplate, WorkoutSession } from './types'

interface AppStore {
  exercises: Exercise[]
  setExercises: (v: Exercise[] | ((prev: Exercise[]) => Exercise[])) => void
  sessions: WorkoutSession[]
  setSessions: (v: WorkoutSession[] | ((prev: WorkoutSession[]) => WorkoutSession[])) => void
  menus: MenuTemplate[]
  setMenus: (v: MenuTemplate[] | ((prev: MenuTemplate[]) => MenuTemplate[])) => void
  bodyweightKg: number | null
  setBodyweightKg: (v: number | null) => void
  goals: Record<string, number>
  setGoals: (v: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void
}

const AppStoreContext = createContext<AppStore | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useLocalStorageState<Exercise[]>('kintore.exercises', DEFAULT_EXERCISES)
  const [sessions, setSessions] = useLocalStorageState<WorkoutSession[]>('kintore.sessions', [])
  const [menus, setMenus] = useLocalStorageState<MenuTemplate[]>('kintore.menus', [])
  const [bodyweightKg, setBodyweightKg] = useLocalStorageState<number | null>('kintore.bodyweightKg', null)
  const [goals, setGoals] = useLocalStorageState<Record<string, number>>('kintore.goals', {})

  return (
    <AppStoreContext.Provider
      value={{ exercises, setExercises, sessions, setSessions, menus, setMenus, bodyweightKg, setBodyweightKg, goals, setGoals }}
    >
      {children}
    </AppStoreContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
