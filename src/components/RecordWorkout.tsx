import { useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useAppStore } from '../store'
import { todayISO } from '../lib/date'
import { getExerciseHistory, getRecentExerciseIds } from '../lib/analysis'
import { getPersonalRecord } from '../lib/insights'
import { Screen } from './Layout'
import { SectionHeading } from './ui/Card'
import { Chip } from './ui/Chip'
import { Button } from './ui/Button'
import { Stepper } from './ui/Stepper'
import { Calendar } from './ui/Calendar'
import { Plus, X } from './ui/icons'
import type { Exercise, ExerciseLog, MuscleGroup } from '../types'

const MUSCLE_GROUPS: MuscleGroup[] = ['胸', '背中', '肩', '脚', '腕', '腹筋', 'その他']

export function RecordWorkout() {
  const { exercises, setExercises, sessions, setSessions, menus } = useAppStore()
  const [date, setDate] = useState(todayISO())
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerExerciseId, setPickerExerciseId] = useState(exercises[0]?.id ?? '')
  const [showNewExercise, setShowNewExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseGroup, setNewExerciseGroup] = useState<MuscleGroup>('その他')
  const [savedMessage, setSavedMessage] = useState('')

  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const markedDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions])

  const todaysMenuExercises = useMemo(() => {
    const weekday = new Date(date).getDay()
    const ids = new Set<string>()
    const list: { exerciseId: string; targetReps: number }[] = []
    for (const menu of menus) {
      if (!menu.weekdays.includes(weekday)) continue
      for (const me of menu.exercises) {
        if (ids.has(me.exerciseId)) continue
        ids.add(me.exerciseId)
        list.push({ exerciseId: me.exerciseId, targetReps: me.targetReps })
      }
    }
    return list
  }, [menus, date])

  const recentExerciseIds = useMemo(() => {
    const menuIds = new Set(todaysMenuExercises.map((m) => m.exerciseId))
    return getRecentExerciseIds(sessions, 12).filter((id) => !menuIds.has(id))
  }, [sessions, todaysMenuExercises])

  function lastWeightFor(exerciseId: string): number {
    const history = getExerciseHistory(sessions, exerciseId)
    return history.length > 0 ? history[history.length - 1].maxWeight : 20
  }

  function addExercise(exerciseId: string, targetReps = 10) {
    if (!exerciseId || logs.some((l) => l.exerciseId === exerciseId)) return
    const weight = lastWeightFor(exerciseId)
    setLogs((prev) => [...prev, { exerciseId, sets: [{ weight, reps: targetReps }] }])
    setShowPicker(false)
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
        return { ...l, sets: [...l.sets, last ? { ...last } : { weight: 20, reps: 10 }] }
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
    addExercise(exercise.id)
    setNewExerciseName('')
    setShowNewExercise(false)
  }

  function saveSession() {
    if (logs.length === 0) return
    setSessions((prev) => [...prev, { id: uuid(), date, exerciseLogs: logs }])
    setLogs([])
    setSavedMessage('Saved')
    setTimeout(() => setSavedMessage(''), 2000)
  }

  return (
    <Screen title="Record">
      <section className="flex items-center justify-between -mt-4">
        <span className="text-footnote label-tertiary">{savedMessage && <span style={{ color: 'var(--good)' }}>{savedMessage}</span>}</span>
      </section>

      <Calendar value={date} onChange={setDate} markedDates={markedDates} />

      {todaysMenuExercises.length > 0 && (
        <section>
          <SectionHeading>Today's Menu</SectionHeading>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
            {todaysMenuExercises.map(({ exerciseId, targetReps }) => (
              <Chip key={exerciseId} active={logs.some((l) => l.exerciseId === exerciseId)} onClick={() => addExercise(exerciseId, targetReps)}>
                {exerciseById.get(exerciseId)?.name}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {recentExerciseIds.length > 0 && (
        <section>
          <SectionHeading>Recent</SectionHeading>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
            {recentExerciseIds.map((id) => (
              <Chip key={id} active={logs.some((l) => l.exerciseId === id)} onClick={() => addExercise(id)}>
                {exerciseById.get(id)?.name}
              </Chip>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        {logs.map((log) => {
          const exercise = exerciseById.get(log.exerciseId)
          return (
            <div key={log.exerciseId} className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-headline label">{exercise?.name}</span>
                <button
                  aria-label={`Remove ${exercise?.name}`}
                  onClick={() => removeExercise(log.exerciseId)}
                  className="flex items-center justify-center rounded-full active:opacity-60"
                  style={{ width: 32, height: 32, color: 'var(--label-tertiary)' }}
                >
                  <X size={16} />
                </button>
              </div>
              {(() => {
                const pr = getPersonalRecord(sessions, log.exerciseId)
                const currentMax = Math.max(...log.sets.map((s) => s.weight))
                if (pr === null) return null
                const isNewPr = currentMax > pr
                return (
                  <p className="text-footnote mb-2" style={{ color: isNewPr ? 'var(--good)' : 'var(--label-tertiary)' }}>
                    {isNewPr ? `New PR! (previous ${pr}kg)` : `PR ${pr}kg — ${(pr - currentMax).toFixed(1)}kg to beat`}
                  </p>
                )
              })()}
              <div className="flex flex-col gap-2.5">
                {log.sets.map((set, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-footnote label-tertiary w-6">{i + 1}</span>
                    <Stepper label="Weight" value={set.weight} onChange={(v) => updateSet(log.exerciseId, i, 'weight', v)} step={2.5} decimals={1} unit="kg" />
                    <Stepper label="Reps" value={set.reps} onChange={(v) => updateSet(log.exerciseId, i, 'reps', v)} step={1} min={1} unit="回" />
                    <button
                      aria-label={`Remove set ${i + 1}`}
                      onClick={() => removeSet(log.exerciseId, i)}
                      className="ml-auto flex items-center justify-center active:opacity-50"
                      style={{ width: 32, height: 32, color: 'var(--label-tertiary)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(log.exerciseId)} className="text-subhead mt-3 active:opacity-60" style={{ color: 'var(--accent-strong)' }}>
                + Add Set
              </button>
            </div>
          )
        })}
      </section>

      <section className="flex flex-col gap-3">
        {!showPicker ? (
          <Button variant="secondary" onClick={() => setShowPicker(true)} className="self-start">
            <Plus size={16} /> More Exercises
          </Button>
        ) : (
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-2">
              <select
                value={pickerExerciseId}
                onChange={(e) => setPickerExerciseId(e.target.value)}
                className="flex-1 min-w-0 text-body rounded-xl px-3 py-2.5"
                style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
              >
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}({e.muscleGroup})
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => addExercise(pickerExerciseId)}>
                Add
              </Button>
            </div>
            <button onClick={() => setShowNewExercise((v) => !v)} className="text-subhead text-left active:opacity-60" style={{ color: 'var(--accent-strong)' }}>
              + New Exercise
            </button>
            {showNewExercise && (
              <div className="flex items-center gap-2">
                <input
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Exercise name"
                  className="flex-1 min-w-0 text-body rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
                />
                <select
                  value={newExerciseGroup}
                  onChange={(e) => setNewExerciseGroup(e.target.value as MuscleGroup)}
                  className="text-body rounded-xl px-2 py-2.5"
                  style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
                >
                  {MUSCLE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={createCustomExercise}>
                  Create
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {logs.length > 0 && (
        <Button onClick={saveSession} className="w-full">
          Save Workout
        </Button>
      )}
      {logs.length === 0 && todaysMenuExercises.length === 0 && recentExerciseIds.length === 0 && (
        <p className="text-subhead label-secondary">Tap "More Exercises" to log your first set.</p>
      )}
    </Screen>
  )
}
