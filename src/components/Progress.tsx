import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppStore } from '../store'
import { useAuth } from '../auth'
import { getExerciseHistory, suggestNextTarget } from '../lib/analysis'
import { analyzeRepDecay, forecastPlateau, getStrengthStandard, projectGoalETA } from '../lib/insights'
import { getForecast, getRegression, type ForecastResult, type RegressionResult } from '../lib/statsApi'
import { formatDateJP } from '../lib/date'
import { Screen } from './Layout'
import { SectionHeading } from './ui/Card'
import { Chip } from './ui/Chip'
import { GroupedList, Row } from './ui/List'
import { Button } from './ui/Button'
import { FlagDot } from './ui/icons'

const TIER_LABELS: Record<string, string> = { untrained: 'Untrained', novice: 'Novice', intermediate: 'Intermediate', advanced: 'Advanced', elite: 'Elite' }

export function ProgressScreen() {
  const { exercises, sessions, goals, setGoals, bodyweightKg, setBodyweightKg } = useAppStore()
  const { session } = useAuth()
  const exercisesWithData = exercises.filter((e) => sessions.some((s) => s.exerciseLogs.some((l) => l.exerciseId === e.id)))
  const [exerciseId, setExerciseId] = useState(exercisesWithData[0]?.id ?? '')
  const [goalDraft, setGoalDraft] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [bwDraft, setBwDraft] = useState(bodyweightKg ? String(bodyweightKg) : '')
  const [editingBw, setEditingBw] = useState(false)
  const exercise = exercises.find((e) => e.id === exerciseId)

  const [regressionResult, setRegressionResult] = useState<RegressionResult | null>(null)
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(false)

  useEffect(() => {
    const token = session?.access_token
    if (!token || !exerciseId) {
      setRegressionResult(null)
      setForecastResult(null)
      return
    }
    let cancelled = false
    setStatsLoading(true)
    setStatsError(false)
    Promise.all([getRegression(exerciseId, token), getForecast(exerciseId, token)]).then(([reg, fc]) => {
      if (cancelled) return
      setStatsLoading(false)
      if (!reg && !fc) {
        setStatsError(true)
        return
      }
      setRegressionResult(reg)
      setForecastResult(fc)
    })
    return () => {
      cancelled = true
    }
  }, [exerciseId, session?.access_token])

  const history = useMemo(() => {
    if (!exerciseId) return []
    return getExerciseHistory(sessions, exerciseId).map((h) => ({ ...h, label: formatDateJP(h.date) }))
  }, [sessions, exerciseId])

  const relatedSessions = useMemo(
    () => sessions.filter((s) => s.exerciseLogs.some((l) => l.exerciseId === exerciseId)).sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, exerciseId],
  )

  const suggestion = useMemo(() => (exercise ? suggestNextTarget(sessions, exercise) : null), [sessions, exercise])
  const plateau = useMemo(() => (exercise ? forecastPlateau(sessions, exercise) : null), [sessions, exercise])
  const repDecay = useMemo(() => (exercise ? analyzeRepDecay(sessions, exercise) : null), [sessions, exercise])
  const strength = useMemo(() => (exercise && bodyweightKg ? getStrengthStandard(sessions, exercise.id, bodyweightKg) : null), [sessions, exercise, bodyweightKg])
  const goal = exercise ? goals[exercise.id] : undefined
  const eta = useMemo(() => (exercise && goal ? projectGoalETA(sessions, exercise.id, exercise.name, goal) : null), [sessions, exercise, goal])

  function saveGoal() {
    const n = Number(goalDraft)
    if (!exercise || !Number.isFinite(n) || n <= 0) return
    setGoals((prev) => ({ ...prev, [exercise.id]: n }))
    setEditingGoal(false)
    setGoalDraft('')
  }

  function saveBodyweight() {
    const n = Number(bwDraft)
    if (!Number.isFinite(n) || n <= 0) return
    setBodyweightKg(n)
    setEditingBw(false)
  }

  if (exercisesWithData.length === 0) {
    return (
      <Screen title="Progress">
        <p className="text-subhead label-secondary">記録がある種目がまだありません。まずは「記録」タブから記録しましょう。</p>
      </Screen>
    )
  }

  return (
    <Screen title="Progress">
      <section>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {exercisesWithData.map((e) => (
            <Chip key={e.id} active={e.id === exerciseId} onClick={() => setExerciseId(e.id)}>
              {e.name}
            </Chip>
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
        <p className="text-caption2 label-secondary mb-2 normal-case" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
          MAX WEIGHT (KG)
        </p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" />
              <XAxis dataKey="label" fontSize={11} stroke="var(--label-tertiary)" />
              <YAxis fontSize={11} stroke="var(--label-tertiary)" />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--separator)', borderRadius: 12, fontSize: 13 }} />
              <Line type="monotone" dataKey="maxWeight" stroke="#f2703d" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {suggestion && suggestion.level !== 'no-data' && (
          <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--separator)' }}>
            <span className="text-footnote label-secondary">Next Target</span>
            <span className="text-headline tabular-nums" style={{ color: 'var(--accent)' }}>
              {suggestion.suggestedWeight != null ? `${suggestion.suggestedWeight}kg` : '—'}
            </span>
          </div>
        )}
      </section>

      <section>
        <SectionHeading>Goal</SectionHeading>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
          {goal ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-subhead label-secondary">Target</span>
                <span className="text-headline tabular-nums label">{goal}kg</span>
              </div>
              {eta && <p className="text-footnote label-secondary mt-2">{eta.message}</p>}
              <button className="text-footnote mt-2" style={{ color: 'var(--accent-strong)' }} onClick={() => { setEditingGoal(true); setGoalDraft(String(goal)) }}>
                Edit Goal
              </button>
            </>
          ) : editingGoal ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="Target weight (kg)"
                className="flex-1 min-w-0 text-body rounded-xl px-3 py-2.5"
                style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
              />
              <Button variant="secondary" onClick={saveGoal}>
                Save
              </Button>
            </div>
          ) : (
            <button className="text-subhead" style={{ color: 'var(--accent-strong)' }} onClick={() => setEditingGoal(true)}>
              + Set a Goal
            </button>
          )}
        </div>
      </section>

      {session && (
        <section>
          <SectionHeading>Advanced Stats (Python)</SectionHeading>
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
            {statsLoading && <p className="text-subhead label-secondary">Running regression…</p>}
            {!statsLoading && statsError && <p className="text-subhead label-secondary">Not enough sessions yet for statistical analysis (need at least 3).</p>}
            {!statsLoading && regressionResult && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-footnote label-secondary">Trend (least squares)</span>
                  <span className="text-headline tabular-nums" style={{ color: 'var(--accent)' }}>
                    {regressionResult.slopeKgPerWeek > 0 ? '+' : ''}
                    {regressionResult.slopeKgPerWeek}kg/week
                  </span>
                </div>
                <p className="text-caption1 label-tertiary normal-case">
                  R²={regressionResult.rSquared} · p={regressionResult.pValue} · {regressionResult.significant ? 'statistically significant' : 'not yet significant'} (n={regressionResult.sessions})
                </p>
              </div>
            )}
            {!statsLoading && forecastResult && forecastResult.predictions.length > 0 && (
              <div className="pt-3" style={{ borderTop: '1px solid var(--separator)' }}>
                <p className="text-footnote label-secondary mb-2">4-week forecast (95% interval)</p>
                <div className="flex flex-col gap-1.5">
                  {forecastResult.predictions.map((p) => (
                    <div key={p.weeksAhead} className="flex items-center justify-between text-subhead">
                      <span className="label-secondary">+{p.weeksAhead}w</span>
                      <span className="tabular-nums label">
                        {p.predictedWeight}kg
                        <span className="text-caption1 label-tertiary normal-case ml-1">
                          ({p.lowerBound}–{p.upperBound})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {(plateau?.sessionsUntilPlateau !== null || repDecay) && (
        <section>
          <SectionHeading>Diagnostics</SectionHeading>
          <GroupedList>
            {plateau?.sessionsUntilPlateau !== null && plateau && (
              <Row icon={<FlagDot tone="warning" />} title={<span className="text-subhead">{plateau.message}</span>} wrap last={!repDecay} />
            )}
            {repDecay && <Row icon={<FlagDot tone="warning" />} title={<span className="text-subhead">{repDecay.message}</span>} wrap last />}
          </GroupedList>
        </section>
      )}

      <section>
        <SectionHeading>Relative Strength</SectionHeading>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
          {!bodyweightKg ? (
            editingBw ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={bwDraft}
                  onChange={(e) => setBwDraft(e.target.value)}
                  placeholder="Body weight (kg)"
                  className="flex-1 min-w-0 text-body rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--fill-secondary)', minHeight: 44 }}
                />
                <Button variant="secondary" onClick={saveBodyweight}>
                  Save
                </Button>
              </div>
            ) : (
              <button className="text-subhead" style={{ color: 'var(--accent-strong)' }} onClick={() => setEditingBw(true)}>
                + Add Body Weight to see strength standards
              </button>
            )
          ) : strength ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-headline label">{TIER_LABELS[strength.tier]}</span>
                <span className="text-footnote label-secondary tabular-nums">{strength.bodyweightRatio.toFixed(2)}× bodyweight</span>
              </div>
              {strength.nextTier && strength.kgToNextTier != null && (
                <p className="text-footnote label-secondary mt-1">+{strength.kgToNextTier.toFixed(1)}kg to reach {TIER_LABELS[strength.nextTier]}</p>
              )}
              <p className="text-caption1 label-tertiary normal-case mt-2">Rough guide, not a medical or professional standard.</p>
            </>
          ) : (
            <p className="text-subhead label-secondary">No standard available for this exercise.</p>
          )}
        </div>
      </section>

      <section>
        <SectionHeading>History</SectionHeading>
        <GroupedList>
          {relatedSessions.map((session, idx) => {
            const log = session.exerciseLogs.find((l) => l.exerciseId === exerciseId)!
            return (
              <Row
                key={session.id}
                title={session.date}
                subtitle={log.sets.map((s) => `${s.weight}kg×${s.reps}`).join(' / ')}
                last={idx === relatedSessions.length - 1}
                wrap
              />
            )
          })}
        </GroupedList>
      </section>
    </Screen>
  )
}
