import { supabase } from './supabaseClient'
import type { Exercise, MenuTemplate, WorkoutSession } from '../types'

export interface RemoteData {
  exercises: Exercise[]
  sessions: WorkoutSession[]
  menus: MenuTemplate[]
  bodyweightKg: number | null
  goals: Record<string, number>
}

export async function pullRemoteData(userId: string): Promise<RemoteData | null> {
  if (!supabase) return null

  const [exercisesRes, sessionsRes, menusRes, profileRes] = await Promise.all([
    supabase.from('exercises').select('*').eq('user_id', userId),
    supabase.from('sessions').select('*').eq('user_id', userId),
    supabase.from('menus').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (exercisesRes.error || sessionsRes.error || menusRes.error || profileRes.error) {
    console.error('Supabase pull failed', exercisesRes.error, sessionsRes.error, menusRes.error, profileRes.error)
    return null
  }

  return {
    exercises: (exercisesRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      muscleGroup: row.muscle_group,
      isCustom: true,
    })),
    sessions: (sessionsRes.data ?? []).map((row) => ({
      id: row.id,
      date: row.date,
      exerciseLogs: row.exercise_logs ?? [],
    })),
    menus: (menusRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      weekdays: row.weekdays ?? [],
      exercises: row.exercises ?? [],
    })),
    bodyweightKg: profileRes.data?.bodyweight_kg ?? null,
    goals: profileRes.data?.goals ?? {},
  }
}

async function reconcileTable(
  table: 'exercises' | 'sessions' | 'menus',
  userId: string,
  rows: Record<string, unknown>[],
  ids: string[],
) {
  if (!supabase) return
  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows)
    if (error) console.error(`Supabase upsert ${table} failed`, error)
  }
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
    .not('id', 'in', `(${ids.length > 0 ? ids.join(',') : "'00000000-0000-0000-0000-000000000000'"})`)
  if (deleteError) console.error(`Supabase delete ${table} failed`, deleteError)
}

export async function pushCustomExercises(userId: string, exercises: Exercise[]) {
  const custom = exercises.filter((e) => e.isCustom)
  const rows = custom.map((e) => ({ id: e.id, user_id: userId, name: e.name, muscle_group: e.muscleGroup }))
  await reconcileTable('exercises', userId, rows, custom.map((e) => e.id))
}

export async function pushSessions(userId: string, sessions: WorkoutSession[]) {
  const rows = sessions.map((s) => ({
    id: s.id,
    user_id: userId,
    date: s.date,
    exercise_logs: s.exerciseLogs,
    updated_at: new Date().toISOString(),
  }))
  await reconcileTable('sessions', userId, rows, sessions.map((s) => s.id))
}

export async function pushMenus(userId: string, menus: MenuTemplate[]) {
  const rows = menus.map((m) => ({ id: m.id, user_id: userId, name: m.name, weekdays: m.weekdays, exercises: m.exercises }))
  await reconcileTable('menus', userId, rows, menus.map((m) => m.id))
}

export async function pushProfile(userId: string, bodyweightKg: number | null, goals: Record<string, number>) {
  if (!supabase) return
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, bodyweight_kg: bodyweightKg, goals, updated_at: new Date().toISOString() })
  if (error) console.error('Supabase upsert profile failed', error)
}
