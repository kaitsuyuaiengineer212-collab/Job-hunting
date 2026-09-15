import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { DEFAULT_EXERCISES } from './lib/defaultExercises'
import { pullRemoteData, pushCustomExercises, pushMenus, pushProfile, pushSessions } from './lib/sync'
import { useAuth } from './auth'
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
  syncing: boolean
}

const AppStoreContext = createContext<AppStore | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useLocalStorageState<Exercise[]>('kintore.exercises', DEFAULT_EXERCISES)
  const [sessions, setSessions] = useLocalStorageState<WorkoutSession[]>('kintore.sessions', [])
  const [menus, setMenus] = useLocalStorageState<MenuTemplate[]>('kintore.menus', [])
  const [bodyweightKg, setBodyweightKg] = useLocalStorageState<number | null>('kintore.bodyweightKg', null)
  const [goals, setGoals] = useLocalStorageState<Record<string, number>>('kintore.goals', {})

  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const isPullingRef = useRef(false)
  const hasPulledForUserRef = useRef<string | null>(null)

  // Pull remote data once per sign-in; upload local data on first-ever sign-in when remote is empty.
  useEffect(() => {
    if (!userId || hasPulledForUserRef.current === userId) return
    hasPulledForUserRef.current = userId
    isPullingRef.current = true
    pullRemoteData(userId).then((remote) => {
      if (!remote) {
        isPullingRef.current = false
        return
      }
      const remoteIsEmpty =
        remote.sessions.length === 0 && remote.menus.length === 0 && remote.exercises.length === 0 && remote.bodyweightKg === null

      if (remoteIsEmpty) {
        const customLocal = exercises.filter((e) => e.isCustom)
        void pushCustomExercises(userId, customLocal)
        void pushSessions(userId, sessions)
        void pushMenus(userId, menus)
        void pushProfile(userId, bodyweightKg, goals)
      } else {
        setExercises([...DEFAULT_EXERCISES, ...remote.exercises])
        setSessions(remote.sessions)
        setMenus(remote.menus)
        setBodyweightKg(remote.bodyweightKg)
        setGoals(remote.goals)
      }
      isPullingRef.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!userId || isPullingRef.current) return
    void pushCustomExercises(userId, exercises)
  }, [userId, exercises])

  useEffect(() => {
    if (!userId || isPullingRef.current) return
    void pushSessions(userId, sessions)
  }, [userId, sessions])

  useEffect(() => {
    if (!userId || isPullingRef.current) return
    void pushMenus(userId, menus)
  }, [userId, menus])

  useEffect(() => {
    if (!userId || isPullingRef.current) return
    void pushProfile(userId, bodyweightKg, goals)
  }, [userId, bodyweightKg, goals])

  useEffect(() => {
    if (!userId) hasPulledForUserRef.current = null
  }, [userId])

  return (
    <AppStoreContext.Provider
      value={{
        exercises,
        setExercises,
        sessions,
        setSessions,
        menus,
        setMenus,
        bodyweightKg,
        setBodyweightKg,
        goals,
        setGoals,
        syncing: Boolean(userId),
      }}
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
