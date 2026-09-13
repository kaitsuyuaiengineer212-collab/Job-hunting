import type { Exercise } from '../types'

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'bench-press', name: 'ベンチプレス', muscleGroup: '胸' },
  { id: 'incline-db-press', name: 'インクラインダンベルプレス', muscleGroup: '胸' },
  { id: 'chest-press-machine', name: 'チェストプレスマシン', muscleGroup: '胸' },
  { id: 'lat-pulldown', name: 'ラットプルダウン', muscleGroup: '背中' },
  { id: 'deadlift', name: 'デッドリフト', muscleGroup: '背中' },
  { id: 'seated-row', name: 'シーテッドロー', muscleGroup: '背中' },
  { id: 'shoulder-press', name: 'ショルダープレス', muscleGroup: '肩' },
  { id: 'side-raise', name: 'サイドレイズ', muscleGroup: '肩' },
  { id: 'squat', name: 'スクワット', muscleGroup: '脚' },
  { id: 'leg-press', name: 'レッグプレス', muscleGroup: '脚' },
  { id: 'leg-extension', name: 'レッグエクステンション', muscleGroup: '脚' },
  { id: 'leg-curl', name: 'レッグカール', muscleGroup: '脚' },
  { id: 'barbell-curl', name: 'バーベルカール', muscleGroup: '腕' },
  { id: 'triceps-pushdown', name: 'トライセプスプッシュダウン', muscleGroup: '腕' },
  { id: 'crunch', name: 'クランチ', muscleGroup: '腹筋' },
  { id: 'plank', name: 'プランク', muscleGroup: '腹筋' },
]
