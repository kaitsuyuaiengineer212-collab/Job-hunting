import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useAppStore } from '../store'
import { todayISO } from '../lib/date'
import type { Exercise, ExerciseLog, MuscleGroup } from '../types'

const MUSCLE_GROUPS: MuscleGroup[] = ['胸', '背中', '肩', '脚', '腕', '腹筋', 'その他']

export function RecordWorkout() {
  const { exercises, setExercises, sessions, setSessions } = useAppStore()
  const [date, setDate] = useState(todayISO())
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [pickerExerciseId, setPickerExerciseId] = useState(exercises[0]?.id ?? '')
  const [showNewExercise, setShowNewExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseGroup, setNewExerciseGroup] = useState<MuscleGroup>('その他')
  const [savedMessage, setSavedMessage] = useState('')

  function addExerciseToSession() {
    if (!pickerExerciseId) return
    if (logs.some((l) => l.exerciseId === pickerExerciseId)) return
    setLogs([...logs, { exerciseId: pickerExerciseId, sets: [{ weight: 0, reps: 10 }] }])
  }

  function updateSet(exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) {
    setLogs((prev) =>
      prev.map((l) =>
        l.exerciseId === exerciseId
          ? { ...l, sets: l.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)) }
          : l,
      ),
    )
  }

  function addSet(exerciseId: string) {
    setLogs((prev) =>
      prev.map((l) => {
        if (l.exerciseId !== exerciseId) return l
        const last = l.sets[l.sets.length - 1]
        return { ...l, sets: [...l.sets, last ? { ...last } : { weight: 0, reps: 10 }] }
      }),
    )
  }

  function removeSet(exerciseId: string, setIndex: number) {
    setLogs((prev) =>
      prev.map((l) => (l.exerciseId === exerciseId ? { ...l, sets: l.sets.filter((_, i) => i !== setIndex) } : l)),
    )
  }

  function removeExercise(exerciseId: string) {
    setLogs((prev) => prev.filter((l) => l.exerciseId !== exerciseId))
  }

  function createCustomExercise() {
    if (!newExerciseName.trim()) return
    const exercise: Exercise = { id: uuid(), name: newExerciseName.trim(), muscleGroup: newExerciseGroup, isCustom: true }
    setExercises((prev) => [...prev, exercise])
    setPickerExerciseId(exercise.id)
    setNewExerciseName('')
    setShowNewExercise(false)
  }

  function saveSession() {
    if (logs.length === 0) return
    setSessions((prev) => [...prev, { id: uuid(), date, exerciseLogs: logs }])
    setLogs([])
    setSavedMessage('記録を保存しました。')
    setTimeout(() => setSavedMessage(''), 2000)
  }

  const exerciseById = new Map(exercises.map((e) => [e.id, e]))

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-bold">トレーニング記録</h2>

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600 dark:text-slate-400">日付</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-md px-2 py-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={pickerExerciseId}
          onChange={(e) => setPickerExerciseId(e.target.value)}
          className="border rounded-md px-2 py-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
        >
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}({e.muscleGroup})
            </option>
          ))}
        </select>
        <button
          onClick={addExerciseToSession}
          className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
        >
          種目を追加
        </button>
        <button
          onClick={() => setShowNewExercise((v) => !v)}
          className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-sm"
        >
          + 新しい種目を作成
        </button>
      </div>

      {showNewExercise && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-md bg-slate-100 dark:bg-slate-900">
          <input
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="種目名"
            className="border rounded-md px-2 py-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
          />
          <select
            value={newExerciseGroup}
            onChange={(e) => setNewExerciseGroup(e.target.value as MuscleGroup)}
            className="border rounded-md px-2 py-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button onClick={createCustomExercise} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">
            作成
          </button>
        </div>
      )}

      <div className="space-y-4">
        {logs.map((log) => {
          const exercise = exerciseById.get(log.exerciseId)
          return (
            <div key={log.exerciseId} className="border rounded-lg p-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{exercise?.name}</span>
                <button onClick={() => removeExercise(log.exerciseId)} className="text-sm text-red-600 hover:underline">
                  削除
                </button>
              </div>
              <div className="space-y-1">
                {log.sets.map((set, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm w-10 text-slate-500">#{i + 1}</span>
                    <input
                      type="number"
                      value={set.weight}
                      onChange={(e) => updateSet(log.exerciseId, i, 'weight', Number(e.target.value))}
                      className="w-20 border rounded-md px-2 py-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-sm text-slate-500">kg ×</span>
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(log.exerciseId, i, 'reps', Number(e.target.value))}
                      className="w-16 border rounded-md px-2 py-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-sm text-slate-500">回</span>
                    <button onClick={() => removeSet(log.exerciseId, i)} className="text-xs text-red-600 ml-2">
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(log.exerciseId)} className="mt-2 text-sm text-indigo-600 hover:underline">
                + セット追加
              </button>
            </div>
          )
        })}
      </div>

      {logs.length > 0 && (
        <button onClick={saveSession} className="px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
          この日の記録を保存
        </button>
      )}
      {savedMessage && <p className="text-emerald-600 text-sm">{savedMessage}</p>}
      {sessions.length === 0 && logs.length === 0 && (
        <p className="text-sm text-slate-500">種目を選んで「種目を追加」を押し、重量と回数を入力してください。</p>
      )}
    </div>
  )
}
