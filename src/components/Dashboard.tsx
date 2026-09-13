import { useMemo } from 'react'
import { useAppStore } from '../store'
import { analyzeGaps, suggestNextTarget } from '../lib/analysis'
import { todayISO } from '../lib/date'

const LEVEL_STYLES: Record<string, string> = {
  increase: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800',
  hold: 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800',
  deload: 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800',
  'no-data': 'border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800',
}

export function Dashboard() {
  const { exercises, sessions, menus } = useAppStore()
  const today = todayISO()

  const menuExerciseIds = new Set(menus.flatMap((m) => m.exercises.map((e) => e.exerciseId)))
  const trackedExercises = exercises.filter(
    (e) => menuExerciseIds.has(e.id) || sessions.some((s) => s.exerciseLogs.some((l) => l.exerciseId === e.id)),
  )

  const suggestions = useMemo(
    () =>
      trackedExercises.map((exercise) => {
        const menuExercise = menus.flatMap((m) => m.exercises).find((me) => me.exerciseId === exercise.id)
        return { exercise, suggestion: suggestNextTarget(sessions, exercise, menuExercise?.targetReps ?? 10) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, trackedExercises, menus],
  )

  const gaps = useMemo(() => analyzeGaps(sessions, exercises, menus, today), [sessions, exercises, menus, today])
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <h2 className="text-xl font-bold">ダッシュボード</h2>

      <section className="space-y-3">
        <h3 className="font-semibold">今の課題</h3>
        <div className="space-y-2">
          {gaps.neglectedMuscleGroups.length > 0 && (
            <div className="border rounded-lg p-3 border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 text-sm">
              直近7日間、<b>{gaps.neglectedMuscleGroups.join('・')}</b> を鍛えていません。バランスよく鍛えるにはこれらの部位のメニューを追加しましょう。
            </div>
          )}
          {gaps.neglectedMenuExercises.length > 0 && (
            <div className="border rounded-lg p-3 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-sm">
              メニューに入っているのに直近やっていない種目があります:
              <ul className="list-disc list-inside mt-1">
                {gaps.neglectedMenuExercises.map((e) => (
                  <li key={e.exerciseId}>
                    {e.exerciseName}
                    {e.daysSinceLast === null ? '(記録なし)' : `(${e.daysSinceLast}日前が最後)`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gaps.stagnantExercises.length > 0 && (
            <div className="border rounded-lg p-3 border-slate-300 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-sm">
              直近3回、重量が変わっていない種目があります(停滞気味):
              <ul className="list-disc list-inside mt-1">
                {gaps.stagnantExercises.map((id) => (
                  <li key={id}>{exerciseById.get(id)?.name ?? id} — レップ数を増やす、種目を変える、休養を検討してみましょう。</li>
                ))}
              </ul>
            </div>
          )}
          {gaps.neglectedMuscleGroups.length === 0 &&
            gaps.neglectedMenuExercises.length === 0 &&
            gaps.stagnantExercises.length === 0 && (
              <p className="text-sm text-slate-500">直近の記録から見つかった課題はありません。順調です。</p>
            )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">次回の目標重量の提案</h3>
        {suggestions.length === 0 && <p className="text-sm text-slate-500">メニューを登録するか、記録をつけると提案が表示されます。</p>}
        <div className="space-y-2">
          {suggestions.map(({ exercise, suggestion }) => (
            <div key={exercise.id} className={`border rounded-lg p-3 text-sm ${LEVEL_STYLES[suggestion.level]}`}>
              <div className="font-semibold">{exercise.name}</div>
              <div>{suggestion.message}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
