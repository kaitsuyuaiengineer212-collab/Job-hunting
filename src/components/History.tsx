import { useAppStore } from '../store'

export function History() {
  const { sessions, exercises, setSessions } = useAppStore()
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))

  function deleteSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">履歴</h2>
      {sorted.length === 0 && <p className="text-sm text-slate-500">まだ記録がありません。</p>}
      {sorted.map((session) => (
        <div key={session.id} className="border rounded-lg p-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{session.date}</span>
            <button onClick={() => deleteSession(session.id)} className="text-sm text-red-600 hover:underline">
              削除
            </button>
          </div>
          <ul className="space-y-1">
            {session.exerciseLogs.map((log) => {
              const exercise = exerciseById.get(log.exerciseId)
              return (
                <li key={log.exerciseId} className="text-sm">
                  <span className="font-medium">{exercise?.name ?? '不明'}</span>
                  {': '}
                  {log.sets.map((s, i) => (
                    <span key={i} className="text-slate-600 dark:text-slate-400">
                      {s.weight}kg×{s.reps}回{i < log.sets.length - 1 ? ' / ' : ''}
                    </span>
                  ))}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
