import type { Exercise } from '../types'

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'bench-press', name: 'Bench Press', muscleGroup: 'Chest' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
  { id: 'chest-press-machine', name: 'Chest Press Machine', muscleGroup: 'Chest' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back' },
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back' },
  { id: 'seated-row', name: 'Seated Row', muscleGroup: 'Back' },
  { id: 'shoulder-press', name: 'Shoulder Press', muscleGroup: 'Shoulders' },
  { id: 'side-raise', name: 'Side Raise', muscleGroup: 'Shoulders' },
  { id: 'squat', name: 'Squat', muscleGroup: 'Legs' },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Legs' },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'Legs' },
  { id: 'leg-curl', name: 'Leg Curl', muscleGroup: 'Legs' },
  { id: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'Arms' },
  { id: 'triceps-pushdown', name: 'Triceps Pushdown', muscleGroup: 'Arms' },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'Core' },
  { id: 'plank', name: 'Plank', muscleGroup: 'Core' },
]
