import { WebTimerPort } from './webTimer.ts'
import type { TimerPort } from './timerPort.ts'

export const timerPort: TimerPort = new WebTimerPort(localStorage)
