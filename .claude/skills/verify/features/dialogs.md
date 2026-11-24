# Dialog keyboard and focus

## Sub-features
- Every sheet (`role="dialog"`, `aria-modal="true"`): Day details, Habits, New/Edit habit, Habit details, Timer, Weekly review, Two misses in a row.
- `src/ui/modal.ts`: focus moves into the dialog on open, Tab and Shift+Tab stay inside the topmost dialog, Escape presses its Close button, focus returns to the control that opened it.

## How to get to it (user POV)
Keyboard or switch access: focus a day cell, the badge or the month card and press Enter; use Tab to move, Escape to close.

## Driving it with Playwright
- `drive.mjs a11y-dialogs`: Day details (Enter on today's cell), Habits (Enter on badge), Habit details (Enter on month card), New habit (Enter on "+ New habit" inside Habits).
- Proof per dialog: `aria-modal="true"`, `document.activeElement` inside it after open, 30 Tabs and 30 Shift+Tabs never leave it, Escape detaches it, focus is back on the opener.

## Gotchas
- Dialogs whose content autofocuses (HabitEdit name field) take focus before the observer sees them; the opener comes from the last `focusout`.
- Habit details replaces the month card while open; focus returns by `aria-label` re-query, not by element identity.
- Timer, Weekly review and Two-miss sheets share `Sheet.tsx` but are not in the journey yet: they need seed data (a missed yesterday, last day of the week, two `x` in a row).
