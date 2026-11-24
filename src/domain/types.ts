export type DayKey = string
export type Mark = 't' | 'x'
export type Marks = Record<DayKey, Mark>
export type Kind = 'daily' | 'weekly' | 'reduce' | 'number'
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Habit {
  id: string
  name: string
  kind?: Kind
  goal?: number
  budget?: number
  target?: number
  unit?: string
  timerMin?: number
  replacement?: string
  later?: boolean
  marks: Marks
  reasons?: Record<DayKey, string>
  urges?: Record<DayKey, number>
  slips?: Record<DayKey, number>
  values?: Record<DayKey, number>
}

export interface AvoidItem { id: string; name: string; replacement: string }

export interface Settings { weekStart: WeekStart; missRules: boolean }

export interface Doc {
  habits: Habit[]
  avoid: AvoidItem[]
  settings: Settings
  cur: string
  notes: Record<DayKey, string>
  theme: 'light' | 'dark'
}

export const DEFAULT_SETTINGS: Settings = { weekStart: 0, missRules: true }
export const kindOf = (h: Habit): Kind => h.kind ?? 'daily'
export const isBuild = (h: Habit) => kindOf(h) === 'daily' || kindOf(h) === 'weekly'
