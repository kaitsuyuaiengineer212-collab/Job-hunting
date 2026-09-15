import { useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useAppStore } from '../store'
import { todayISO } from '../lib/date'
import { getExerciseHistory, getRecentExerciseIds } from '../lib/analysis'
import { getPersonalRecord } from '../lib/insights'
import { Screen } from './Layout'
import { Card, SectionHeading } from './ui/Card'
import { Chip } from './ui/Chip'
import { Button } from './ui/Button'
import { Stepper } from './ui/Stepper'
import { Calendar } from './ui/Calendar'
import { ChevronLeft, Plus, X } from './ui/icons'
import { format, parseISO } from 'date-fns'
import { MUSCLE_COLORS } from '../lib/muscleColors'
import { MUSCLE_GROUPS, type Exercise, type ExerciseLog, type MuscleGroup, type SetEntry, type WorkoutSession } from '../types'

export function RecordWorkout() {
  const { exercises, setExercises, sessions, setSessions, menus } = useAppStore()
  const [date, setDate] = useState(todayISO())
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerGroup, setPickerGroup] = useState<MuscleGroup | null>(null)
  const [showNewExercise, setShowNewExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseGroup, setNewExerciseGroup] = useState<MuscleGroup>('Other')
  const [savedMessage, setSavedMessage] = useState('')

  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises])
  const markedDates = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions])
  const sessionsForDate = useMemo(() => sessions.filter((s) => s.date === date), [sessions, date])
  const groupsWithExercises = useMemo(() => MUSCLE_GROUPS.filter((g) => exercises.some((e) => e.muscleGroup === g)), [exercises])
  const pickerExercises = useMemo(() => (pickerGroup ? exercises.filter((e) => e.muscleGroup === pickerGroup) : []), [exercises, pickerGroup])

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
    closePicker()
  }

  function openPicker() {
    setShowPicker(true)
    setPickerGroup(null)
    setShowNewExercise(false)
  }

  function closePicker() {
    setShowPicker(false)
    setPickerGroup(null)
    setShowNewExercise(false)
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

      {sessionsForDate.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Recorded on {format(parseISO(date), 'MMM d')}</SectionHeading>
          {sessionsForDate.map((session) => (
            <RecordedSessionCard key={session.id} session={session} exerciseById={exerciseById} />
          ))}
        </section>
      )}

      {todaysMenuExercises.length > 0 && (
        <section>
          <SectionHeading>Today's Menu</SectionHeading>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
            {todaysMenuExercises.map(({ exerciseId, targetReps }) => (
              <Chip
                key={exerciseId}
                active={logs.some((l) => l.exerciseId === exerciseId)}
                tone={exerciseById.get(exerciseId) && MUSCLE_COLORS[exerciseById.get(exerciseId)!.muscleGroup]}
                onClick={() => addExercise(exerciseId, targetReps)}
              >
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
              <Chip
                key={id}
                active={logs.some((l) => l.exerciseId === id)}
                tone={exerciseById.get(id) && MUSCLE_COLORS[exerciseById.get(id)!.muscleGroup]}
                onClick={() => addExercise(id)}
              >
                {exerciseById.get(id)?.name}
              </Chip>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        {logs.map((log) => (
          <WorkoutExerciseCard
            key={log.exerciseId}
            log={log}
            exercise={exerciseById.get(log.exerciseId)}
            sessions={sessions}
            onRemove={() => removeExercise(log.exerciseId)}
            onUpdateSet={(setIndex, field, value) => updateSet(log.exerciseId, setIndex, field, value)}
            onAddSet={() => addSet(log.exerciseId)}
            onRemoveSet={(setIndex) => removeSet(log.exerciseId, setIndex)}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        {!showPicker ? (
          <Button variant="secondary" onClick={openPicker} className="self-start">
            <Plus size={16} /> More Exercises
          </Button>
        ) : (
          <Card padding="p-4" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-headline label">{pickerGroup ?? 'Choose a Muscle Group'}</span>
              <button
                aria-label={pickerGroup ? 'Back to muscle groups' : 'Close'}
                onClick={() => (pickerGroup ? setPickerGroup(null) : closePicker())}
                className="flex items-center justify-center rounded-full active:opacity-60"
                style={{ width: 32, height: 32, color: 'var(--label-tertiary)' }}
              >
                {pickerGroup ? <ChevronLeft size={18} /> : <X size={18} />}
              </button>
            </div>

            {!pickerGroup ? (
              <div className="flex flex-wrap gap-2">
                {groupsWithExercises.map((g) => (
                  <Chip key={g} tone={MUSCLE_COLORS[g]} onClick={() => setPickerGroup(g)}>
                    {g}
                  </Chip>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pickerExercises.map((e) => (
                  <Chip key={e.id} active={logs.some((l) => l.exerciseId === e.id)} tone={MUSCLE_COLORS[e.muscleGroup]} onClick={() => addExercise(e.id)}>
                    {e.name}
                  </Chip>
                ))}
              </div>
            )}

            <button onClick={() => setShowNewExercise((v) => !v)} className="text-subhead text-left active:opacity-60" style={{ color: 'var(--accent-strong)' }}>
              + New Exercise
            </button>
            {showNewExercise && (
              <div className="flex flex-col gap-2">
                <input
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Exercise name"
                  className="text-body rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
                />
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUPS.map((g) => (
                    <Chip key={g} active={newExerciseGroup === g} tone={MUSCLE_COLORS[g]} onClick={() => setNewExerciseGroup(g)}>
                      {g}
                    </Chip>
                  ))}
                </div>
                <Button variant="secondary" onClick={createCustomExercise} className="self-start">
                  Create
                </Button>
              </div>
            )}
          </Card>
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

function RecordedSessionCard({ session, exerciseById }: { session: WorkoutSession; exerciseById: Map<string, Exercise> }) {
  return (
    <Card padding="p-4" className="flex flex-col gap-3">
      {session.exerciseLogs.map((log, index) => (
        <div
          key={log.exerciseId}
          className="flex flex-col gap-1.5"
          style={index > 0 ? { paddingTop: 12, borderTop: '1px solid var(--separator)' } : undefined}
        >
          <span className="text-subhead label" style={{ fontWeight: 600 }}>
            {exerciseById.get(log.exerciseId)?.name ?? 'Unknown Exercise'}
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {log.sets.map((set, setIndex) => (
              <span key={setIndex} className="text-footnote label-secondary tabular-nums">
                {set.weight}kg × {set.reps}
              </span>
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}

interface WorkoutExerciseCardProps {
  log: ExerciseLog
  exercise: Exercise | undefined
  sessions: WorkoutSession[]
  onRemove: () => void
  onUpdateSet: (setIndex: number, field: keyof SetEntry, value: number) => void
  onAddSet: () => void
  onRemoveSet: (setIndex: number) => void
}

function WorkoutExerciseCard({ log, exercise, sessions, onRemove, onUpdateSet, onAddSet, onRemoveSet }: WorkoutExerciseCardProps) {
  const personalRecord = getPersonalRecord(sessions, log.exerciseId)
  const currentMax = Math.max(...log.sets.map((set) => set.weight))
  const isNewPersonalRecord = personalRecord !== null && currentMax > personalRecord

  return (
    <Card padding="p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-headline label">{exercise?.name}</span>
        <button aria-label={`Remove ${exercise?.name}`} onClick={onRemove} className="flex items-center justify-center rounded-full active:opacity-60" style={{ width: 32, height: 32, color: 'var(--label-tertiary)' }}>
          <X size={16} />
        </button>
      </div>
      {personalRecord !== null && <p className="text-footnote mb-2" style={{ color: isNewPersonalRecord ? 'var(--good)' : 'var(--label-tertiary)' }}>{isNewPersonalRecord ? `New PR! (previous ${personalRecord}kg)` : `PR ${personalRecord}kg — ${(personalRecord - currentMax).toFixed(1)}kg to beat`}</p>}
      <div className="flex flex-col gap-2.5">
        {log.sets.map((set, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-footnote label-tertiary w-6">{index + 1}</span>
            <Stepper label="Weight" value={set.weight} onChange={(value) => onUpdateSet(index, 'weight', value)} step={2.5} decimals={1} unit="kg" />
            <Stepper label="Reps" value={set.reps} onChange={(value) => onUpdateSet(index, 'reps', value)} step={1} min={1} unit="reps" />
            <button aria-label={`Remove set ${index + 1}`} onClick={() => onRemoveSet(index)} className="ml-auto flex items-center justify-center active:opacity-50" style={{ width: 32, height: 32, color: 'var(--label-tertiary)' }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={onAddSet} className="text-subhead mt-3 active:opacity-60" style={{ color: 'var(--accent-strong)' }}>+ Add Set</button>
    </Card>
  )
}
