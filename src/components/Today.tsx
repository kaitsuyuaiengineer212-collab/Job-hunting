import { useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { Bar, BarChart, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppStore } from '../store'
import { analyzeGaps, getExerciseTrends, getMuscleGroupVolumes, getWeeklyStats, shiftDate } from '../lib/analysis'
import {
  detectAdherenceDropoff,
  detectDistributionSkew,
  diagnoseStagnation,
  findCorrelatedExercises,
  forecastPlateau,
  generateDeloadPlan,
  generateWeeklyNarrative,
  getRestReadiness,
  lifetimeNeglectedMuscleGroups,
  rankLeverage,
  suggestPhaseShift,
  suggestSubstitution,
} from '../lib/insights'
import { todayISO } from '../lib/date'
import { Screen } from './Layout'
import { SectionHeading } from './ui/Card'
import { GroupedList, Row } from './ui/List'
import { Button } from './ui/Button'
import { FlagDot, Flame, Layers, TrendingUp } from './ui/icons'
import type { MuscleGroup } from '../types'

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  胸: '#3d78ab',
  背中: '#5b8c5a',
  肩: '#b98a3d',
  脚: '#a1533f',
  腕: '#7a5ba6',
  腹筋: '#4fa39a',
  その他: '#8a8d90',
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

type Insight = { key: string; tone: 'critical' | 'warning' | 'good' | 'info'; text: string }

export function Today({ onGoToRecord }: { onGoToRecord: () => void }) {
  const { exercises, sessions, menus, setMenus } = useAppStore()
  const today = todayISO()
  const exerciseById = new Map(exercises.map((e) => [e.id, e]))
  const [deloadCreated, setDeloadCreated] = useState(false)

  const weekly = useMemo(() => getWeeklyStats(sessions, today), [sessions, today])

  const muscleData = useMemo(() => {
    const since = shiftDate(today, -30)
    return getMuscleGroupVolumes(sessions, exercises, since)
      .filter((m) => m.volume > 0)
      .sort((a, b) => b.volume - a.volume)
  }, [sessions, exercises, today])

  const trends = useMemo(() => getExerciseTrends(sessions, exercises).slice(0, 6), [sessions, exercises])
  const gaps = useMemo(() => analyzeGaps(sessions, exercises, menus, today), [sessions, exercises, menus, today])
  const restReadiness = useMemo(() => getRestReadiness(sessions, exercises, today), [sessions, exercises, today])
  const leverage = useMemo(() => rankLeverage(sessions, exercises, menus, today), [sessions, exercises, menus, today])
  const narrative = useMemo(() => generateWeeklyNarrative(sessions, exercises, today), [sessions, exercises, today])

  const stagnationDiagnoses = useMemo(
    () => exercises.map((e) => diagnoseStagnation(sessions, e)).filter((d) => d !== null),
    [sessions, exercises],
  )

  const plateauCandidates = useMemo(() => {
    const forecasts = exercises
      .filter((e) => sessions.some((s) => s.exerciseLogs.some((l) => l.exerciseId === e.id)))
      .map((e) => forecastPlateau(sessions, e))
      .filter((f) => f.sessionsUntilPlateau !== null && f.sessionsUntilPlateau <= 3)
    return forecasts.sort((a, b) => (a.sessionsUntilPlateau ?? 99) - (b.sessionsUntilPlateau ?? 99))
  }, [sessions, exercises])

  const substitution = useMemo(() => {
    for (const id of exerciseById.keys()) {
      const s = suggestSubstitution(sessions, exercises, id, today)
      if (s) return s
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, exercises, today])

  const skew = useMemo(() => detectDistributionSkew(sessions, today), [sessions, today])
  const dropoffs = useMemo(() => detectAdherenceDropoff(sessions, menus, today), [sessions, menus, today])
  const lifetimeNeglected = useMemo(() => (sessions.length >= 5 ? lifetimeNeglectedMuscleGroups(sessions, exercises) : []), [sessions, exercises])
  const correlation = useMemo(() => findCorrelatedExercises(sessions, exercises), [sessions, exercises])
  const phase = useMemo(() => suggestPhaseShift(sessions, today), [sessions, today])

  const insights: Insight[] = []
  if (gaps.neglectedMuscleGroups.length > 0) {
    insights.push({ key: 'muscle', tone: 'critical', text: `直近7日間、${gaps.neglectedMuscleGroups.join('・')}を鍛えていません` })
  }
  for (const d of dropoffs) {
    insights.push({ key: `dropoff-${d.menuId}-${d.weekday}`, tone: 'critical', text: `「${d.menuName}」の${WEEKDAYS_JA[d.weekday]}曜日、直近${d.scheduledCount}回連続で未実施です` })
  }
  if (lifetimeNeglected.length > 0) {
    insights.push({ key: 'lifetime', tone: 'critical', text: `記録開始から一度も${lifetimeNeglected.join('・')}を鍛えていません` })
  }
  for (const e of gaps.neglectedMenuExercises) {
    insights.push({
      key: `menu-${e.exerciseId}`,
      tone: 'warning',
      text: `${e.exerciseName}をメニューに設定していますが、${e.daysSinceLast === null ? 'まだ記録がありません' : `${e.daysSinceLast}日間やっていません`}`,
    })
  }
  for (const d of stagnationDiagnoses) {
    insights.push({ key: `stag-${d!.exerciseId}`, tone: 'warning', text: d!.message })
  }
  for (const p of plateauCandidates) {
    insights.push({ key: `plateau-${p.exerciseId}`, tone: 'warning', text: p.message })
  }
  if (substitution) {
    insights.push({
      key: 'substitution',
      tone: 'warning',
      text: `${substitution.exerciseName}が${substitution.weeksStreak}週連続です。${substitution.substituteName}に変えてみては?`,
    })
  }
  if (skew.isSkewed) {
    insights.push({ key: 'skew', tone: 'warning', text: `直近4週間、${skew.topWeekdays.map((w) => WEEKDAYS_JA[w]).join('・')}曜日にボリュームの${Math.round(skew.sharePct)}%が集中しています` })
  }
  if (correlation) {
    insights.push({ key: 'correlation', tone: 'info', text: `${correlation.nameA}と${correlation.nameB}の重量は連動して伸びる傾向があります(相関 ${correlation.correlation.toFixed(2)})` })
  }
  if (phase.suggestSwitch) {
    insights.push({ key: 'phase', tone: 'info', text: phase.message })
  }

  const deloadTargets = Array.from(
    new Set([...stagnationDiagnoses.map((d) => d!.exerciseId), ...plateauCandidates.map((p) => p.exerciseId)]),
  )

  function createDeloadMenu() {
    if (deloadTargets.length === 0) return
    const plan = generateDeloadPlan(deloadTargets)
    setMenus((prev) => [...prev, { id: uuid(), name: plan.name, weekdays: [], exercises: plan.exercises }])
    setDeloadCreated(true)
  }

  if (sessions.length === 0) {
    return (
      <Screen title="Today">
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-headline label mb-1">Welcome 💪</p>
          <p className="text-subhead label-secondary mb-4">Log your first workout to see your stats here.</p>
          <Button onClick={onGoToRecord}>Start Logging</Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen title="Today">
      <section className="grid grid-cols-3 gap-3">
        <StatTile icon={<Layers size={18} />} label="Volume (7d)" value={`${Math.round(weekly.volume).toLocaleString()}`} unit="kg" />
        <StatTile icon={<TrendingUp size={18} />} label="Sessions (7d)" value={`${weekly.sessionCount}`} />
        <StatTile icon={<Flame size={18} />} label="Streak" value={`${weekly.streakDays}`} unit="day" />
      </section>

      <section>
        <SectionHeading>This Week</SectionHeading>
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
          <p className="text-subhead label">{narrative}</p>
        </div>
      </section>

      {leverage.length > 0 && (
        <section>
          <SectionHeading>Focus of the Week</SectionHeading>
          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'var(--accent-soft)' }}>
            <div>
              <p className="text-headline" style={{ color: 'var(--accent-strong)' }}>
                {leverage[0].name}
              </p>
              <p className="text-footnote label-secondary mt-0.5">{leverage[0].reason}</p>
            </div>
            <Button variant="secondary" onClick={onGoToRecord}>
              Log
            </Button>
          </div>
        </section>
      )}

      {muscleData.length > 0 && (
        <section>
          <SectionHeading>Muscle Balance (30d)</SectionHeading>
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={muscleData} dataKey="volume" nameKey="muscleGroup" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {muscleData.map((m) => (
                      <Cell key={m.muscleGroup} fill={MUSCLE_COLORS[m.muscleGroup]} stroke="none" />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    formatter={(v: string) => <span style={{ color: 'var(--label-secondary)', fontSize: 13 }}>{v}</span>}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--separator)', borderRadius: 12, fontSize: 13 }}
                    formatter={(v) => [`${Math.round(Number(v)).toLocaleString()} kg`, 'Volume']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {trends.length > 0 && (
        <section>
          <SectionHeading>Progress vs Last Session</SectionHeading>
          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ height: Math.max(140, trends.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} layout="vertical" margin={{ left: 8, right: 40 }}>
                  <XAxis type="number" hide domain={['dataMin - 5', 'dataMax + 5']} />
                  <YAxis type="category" dataKey="name" width={92} fontSize={12} stroke="var(--label-tertiary)" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--separator)', borderRadius: 12, fontSize: 13 }}
                    formatter={(v) => [`${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%`, 'Change']}
                  />
                  <Bar dataKey="changePct" radius={6} barSize={14} minPointSize={2}>
                    {trends.map((t) => (
                      <Cell key={t.exerciseId} fill={t.changePct >= 0 ? 'var(--good)' : 'var(--critical)'} />
                    ))}
                    <LabelList
                      dataKey="changePct"
                      position="right"
                      formatter={(v) => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%`}
                      style={{ fontSize: 11, fill: 'var(--label-secondary)' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHeading>Recovery</SectionHeading>
        <GroupedList>
          {restReadiness.map((r, idx) => (
            <Row
              key={r.muscleGroup}
              icon={<FlagDot tone={r.ready ? 'good' : 'warning'} />}
              title={r.muscleGroup}
              trailing={r.ready ? 'Ready' : `${r.recoveryDays - (r.daysSinceTrained ?? 0)}d left`}
              last={idx === restReadiness.length - 1}
            />
          ))}
        </GroupedList>
      </section>

      {insights.length > 0 && (
        <section>
          <SectionHeading>Insights</SectionHeading>
          <GroupedList>
            {insights.map((i, idx) => (
              <Row key={i.key} icon={<FlagDot tone={i.tone} />} title={<span className="text-subhead">{i.text}</span>} last={idx === insights.length - 1} wrap />
            ))}
          </GroupedList>
          {deloadTargets.length > 0 && (
            <div className="mt-3">
              {deloadCreated ? (
                <p className="text-footnote label-secondary">Deload Week added to Menu.</p>
              ) : (
                <Button variant="secondary" onClick={createDeloadMenu} className="self-start">
                  Generate Deload Week
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </Screen>
  )
}

function StatTile({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
      <span style={{ color: 'var(--accent)' }}>{icon}</span>
      <div>
        <span className="text-title3 label tabular-nums">{value}</span>
        {unit && <span className="text-caption1 label-tertiary normal-case ml-0.5">{unit}</span>}
      </div>
      <span className="text-caption1 label-tertiary normal-case" style={{ fontWeight: 500 }}>
        {label}
      </span>
    </div>
  )
}
