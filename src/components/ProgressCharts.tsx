import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppStore } from '../store'
import { getExerciseHistory } from '../lib/analysis'
import { formatDateJP } from '../lib/date'

export function ProgressCharts() {
  const { exercises, sessions } = useAppStore()
  const exercisesWithData = exercises.filter((e) => sessions.some((s) => s.exerciseLogs.some((l) => l.exerciseId === e.id)))
  const [exerciseId, setExerciseId] = useState(exercisesWithData[0]?.id ?? '')

  const data = useMemo(() => {
    if (!exerciseId) return []
    return getExerciseHistory(sessions, exerciseId).map((h) => ({
      ...h,
      label: formatDateJP(h.date),
    }))
  }, [sessions, exerciseId])

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">進捗グラフ</h2>
      {exercisesWithData.length === 0 && <p className="text-sm text-slate-500">記録がある種目がまだありません。</p>}
      {exercisesWithData.length > 0 && (
        <>
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            className="border rounded-md px-2 py-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
          >
            {exercisesWithData.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <div>
            <h3 className="text-sm font-semibold mb-1 text-slate-600 dark:text-slate-400">最大重量の推移(kg)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="maxWeight" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1 text-slate-600 dark:text-slate-400">総ボリュームの推移(kg×回)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="totalVolume" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
