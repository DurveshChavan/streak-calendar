import type { Timer, TimerKind } from '../domain/timer.ts'

export interface StartTimer { habitId: string; kind: TimerKind; minutes: number }

export interface TimerPort {
  current(): Promise<Timer | null>
  start(t: StartTimer): Promise<Timer>
  cancel(): Promise<void>
  drain(): Promise<Timer[]>
}
