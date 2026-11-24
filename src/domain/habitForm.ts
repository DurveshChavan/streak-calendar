import { kindOf, type Habit, type Kind } from './types.ts'

export interface HabitForm { name: string; kind: Kind; goal: string; budget: string; target: string; unit: string; timerMin: string; replacement: string }

export const DEFAULT_TIMER: Record<Kind, number> = { daily: 5, weekly: 5, reduce: 20, number: 5 }
const CONFIG: (keyof Habit)[] = ['kind', 'goal', 'budget', 'target', 'unit', 'timerMin', 'replacement']

export const kindChoices = (old?: Habit): Kind[] => {
  if (!old) return ['daily', 'weekly', 'reduce', 'number']
  const k = kindOf(old)
  return k === 'daily' || k === 'weekly' ? ['daily', 'weekly'] : [k]
}

const str = (v: unknown) => (v === undefined ? '' : String(v))
export const toForm = (h?: Habit): HabitForm => ({
  name: h?.name || '', kind: h ? kindOf(h) : 'daily', goal: str(h?.goal), budget: str(h?.budget), target: str(h?.target),
  unit: h?.unit || '', timerMin: str(h?.timerMin), replacement: h?.replacement || '',
})

const whole = (s: string, min: number, max: number) => { const n = Number(s); return /^\d+$/.test(s.trim()) && n >= min && n <= max ? n : null }

export function fromForm(f: HabitForm, id: string, old?: Habit): { habit?: Habit; error?: string } {
  const name = f.name.trim().slice(0, 24)
  if (!name) return { error: 'Give the habit a name.' }
  const h: Habit = { ...(old || { marks: {} }), id, name }
  for (const k of CONFIG) delete h[k]
  if (f.kind !== 'daily') h.kind = f.kind
  if (f.kind === 'weekly') {
    const g = whole(f.goal, 1, 7)
    if (g === null) return { error: 'Pick a goal from 1 to 7 days a week.' }
    h.goal = g
  }
  if (f.kind === 'reduce') {
    if (f.budget.trim()) { const b = whole(f.budget, 1, 999); if (b === null) return { error: 'The budget is a whole number, 1 or more, or empty.' }; h.budget = b }
    if (f.replacement.trim()) h.replacement = f.replacement.trim().slice(0, 80)
  }
  if (f.kind === 'number') {
    if (f.target.trim()) { const t = Number(f.target); if (!(t > 0)) return { error: 'The target is a number above 0, or empty.' }; h.target = t }
    if (f.unit.trim()) h.unit = f.unit.trim().slice(0, 24)
  }
  if (f.timerMin.trim()) {
    const m = whole(f.timerMin, 1, 120)
    if (m === null) return { error: 'The timer is 1 to 120 minutes.' }
    if (m !== DEFAULT_TIMER[f.kind]) h.timerMin = m
  }
  return { habit: h }
}
