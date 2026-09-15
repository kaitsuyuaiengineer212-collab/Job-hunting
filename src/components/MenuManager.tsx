import { useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useAppStore } from '../store'
import type { MenuExercise, MenuTemplate } from '../types'
import { Screen } from './Layout'
import { Card, SectionHeading } from './ui/Card'
import { GroupedList, Row } from './ui/List'
import { Chip } from './ui/Chip'
import { Button } from './ui/Button'
import { Stepper } from './ui/Stepper'
import { Plus, X, ClipboardList } from './ui/icons'

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MenuManager() {
  const { menus, setMenus, exercises } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [draftExercises, setDraftExercises] = useState<MenuExercise[]>([])
  const [pickerExerciseId, setPickerExerciseId] = useState(exercises[0]?.id ?? '')

  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises])

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
    setShowForm(false)
  }

  function deleteMenu(id: string) {
    setMenus((prev) => prev.filter((m) => m.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <Screen title="Menu">
      <section>
        {menus.length === 0 && !showForm && (
          <p className="text-subhead label-secondary mb-4">Create a weekly menu to add exercises with one tap on the Record screen.</p>
        )}
        {menus.length > 0 && (
          <GroupedList>
            {menus.map((menu, idx) => (
              <div key={menu.id}>
                <Row
                  icon={<ClipboardList size={16} />}
                  title={menu.name}
                  subtitle={menu.weekdays.length > 0 ? menu.weekdays.map((d) => WEEKDAYS_EN[d]).join(', ') : 'No days set'}
                  trailing={`${menu.exercises.length}`}
                  chevron
                  onClick={() => setExpandedId((prev) => (prev === menu.id ? null : menu.id))}
                  last={idx === menus.length - 1 && expandedId !== menu.id}
                />
                {expandedId === menu.id && (
                  <div className="px-4 pb-4" style={{ borderBottom: idx === menus.length - 1 ? 'none' : '1px solid var(--separator)' }}>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {menu.exercises.map((me) => (
                        <div key={me.exerciseId} className="flex items-center justify-between text-subhead label-secondary">
                          <span>{exerciseById.get(me.exerciseId)?.name}</span>
                          <span className="tabular-nums">
                            {me.targetSets} × {me.targetReps}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button variant="destructive" onClick={() => deleteMenu(menu.id)}>
                      Delete Menu
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </GroupedList>
        )}
      </section>

      {!showForm ? (
        <Button variant="secondary" onClick={() => setShowForm(true)} className="self-start">
          <Plus size={16} /> New Menu
        </Button>
      ) : (
        <Card padding="p-4" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-headline label">New Menu</span>
            <button onClick={() => setShowForm(false)} className="active:opacity-60" style={{ color: 'var(--label-tertiary)' }}>
              <X size={18} />
            </button>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Menu name (e.g. Push Day)"
            className="text-body rounded-xl px-3 py-2.5"
            style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
          />

          <div>
            <SectionHeading>Days</SectionHeading>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS_EN.map((label, i) => (
                <Chip key={label} active={weekdays.includes(i)} onClick={() => toggleWeekday(i)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading>Exercises</SectionHeading>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={pickerExerciseId}
                onChange={(e) => setPickerExerciseId(e.target.value)}
                className="flex-1 min-w-0 text-body rounded-xl px-3 py-2.5"
                style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
              >
                {exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={addExerciseToDraft}>
                Add
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              {draftExercises.map((de) => (
                <div key={de.exerciseId} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-subhead label truncate">{exerciseById.get(de.exerciseId)?.name}</span>
                    <button onClick={() => removeDraftExercise(de.exerciseId)} className="active:opacity-50 shrink-0" style={{ color: 'var(--label-tertiary)' }}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stepper label="Sets" value={de.targetSets} onChange={(v) => updateDraftExercise(de.exerciseId, 'targetSets', v)} step={1} min={1} unit="set" />
                    <Stepper label="Reps" value={de.targetReps} onChange={(v) => updateDraftExercise(de.exerciseId, 'targetReps', v)} step={1} min={1} unit="rep" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={saveMenu}>Save Menu</Button>
        </Card>
      )}
    </Screen>
  )
}
