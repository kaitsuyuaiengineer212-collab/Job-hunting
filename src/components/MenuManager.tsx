import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useAppStore } from '../store'
import { WEEKDAY_LABELS, type MenuExercise, type MenuTemplate } from '../types'

export function MenuManager() {
  const { menus, setMenus, exercises } = useAppStore()
  const [name, setName] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [draftExercises, setDraftExercises] = useState<MenuExercise[]>([])
  const [pickerExerciseId, setPickerExerciseId] = useState(exercises[0]?.id ?? '')

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function addExerciseToDraft() {
    if (!pickerExerciseId || draftExercises.some((e) => e.exerciseId === pickerExerciseId)) return
    setDraftExercises((prev) => [...prev, { exerciseId: pickerExerciseId, targetSets: 3, targetReps: 10 }])
  }

  function updateDraftExercise(exerciseId: string, field: 'targetSets' | 'targetReps', value: number) {
    setDraftExercises((prev) => prev.map((e) => (e.exerciseId === exerciseId ? { ...e, [field]: value } : e)))
  }

  function removeDraftExercise(exerciseId: string) {
    setDraftExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId))
  }

  function saveMenu() {
    if (!name.trim() || draftExercises.length === 0) return
    const menu: MenuTemplate = { id: uuid(), name: name.trim(), weekdays, exercises: draftExercises }
    setMenus((prev) => [...prev, menu])
    setName('')
    setWeekdays([])
    setDraftExercises([])
  }

  function deleteMenu(id: string) {
    setMenus((prev) => prev.filter((m) => m.id !== id))
  }

  const exerciseById = new Map(exercises.map((e) => [e.id, e]))

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-bold">トレーニングメニュー管理</h2>

      <div className="border rounded-lg p-3 space-y-3 border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold">新しいメニューを作成</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="メニュー名(例: プッシュデイ)"
          className="w-full border rounded-md px-2 py-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
        />
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => toggleWeekday(i)}
              className={`px-2 py-1 rounded-md text-sm border ${
                weekdays.includes(i)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pickerExerciseId}
            onChange={(e) => setPickerExerciseId(e.target.value)}
            className="border rounded-md px-2 py-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
          >
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <button onClick={addExerciseToDraft} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">
            追加
          </button>
        </div>

        <ul className="space-y-2">
          {draftExercises.map((de) => (
            <li key={de.exerciseId} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{exerciseById.get(de.exerciseId)?.name}</span>
              <input
                type="number"
                value={de.targetSets}
                onChange={(e) => updateDraftExercise(de.exerciseId, 'targetSets', Number(e.target.value))}
                className="w-14 border rounded-md px-1 py-0.5 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
              />
              <span>セット ×</span>
              <input
                type="number"
                value={de.targetReps}
                onChange={(e) => updateDraftExercise(de.exerciseId, 'targetReps', Number(e.target.value))}
                className="w-14 border rounded-md px-1 py-0.5 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
              />
              <span>回</span>
              <button onClick={() => removeDraftExercise(de.exerciseId)} className="text-red-600">
                ×
              </button>
            </li>
          ))}
        </ul>

        <button onClick={saveMenu} className="px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
          メニューを保存
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">登録済みメニュー</h3>
        {menus.length === 0 && <p className="text-sm text-slate-500">まだメニューがありません。</p>}
        {menus.map((menu) => (
          <div key={menu.id} className="border rounded-lg p-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">
                {menu.name}
                {menu.weekdays.length > 0 && (
                  <span className="ml-2 text-xs text-slate-500">
                    ({menu.weekdays.map((d) => WEEKDAY_LABELS[d]).join('・')})
                  </span>
                )}
              </span>
              <button onClick={() => deleteMenu(menu.id)} className="text-sm text-red-600 hover:underline">
                削除
              </button>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-400">
              {menu.exercises.map((me) => (
                <li key={me.exerciseId}>
                  {exerciseById.get(me.exerciseId)?.name}: {me.targetSets}セット × {me.targetReps}回
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
