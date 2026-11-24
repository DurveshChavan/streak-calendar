# Glossary — Streak Calendar

The words the app, the docs and the code use. One meaning per word.

## Habits

**Habit**
Something the user wants to do more of, or less of, and tracks per day.
Every habit has exactly one *kind*.

**Kind**
What sort of habit it is. There are four: *Build daily*, *Build weekly*, *Reduce*, *Number*.
_Avoid_: type, category.

**Build daily**
A habit that is due every day of the week. The only kind that counts in the *daily score*, and the only kind with *miss rules*.
A 2.0 habit is a Build daily habit.

**Build weekly**
A habit with a *goal* of N days per week. The user ticks the days it happens. A day that is not ticked is not a miss.

**Reduce**
A habit the user wants to do less. Its main number is *resisted urges*. Shown on screen as **"Break a habit"**; *Reduce* is the name in docs and code.
_Avoid_: bad habit, negative habit.

**Number**
A habit with one value per day (pages, minutes, glasses). It can have a weekly *target*. It has no streak.

**Avoid item**
A thing the user wants to keep out of their life, with a *replacement action*. Not a habit: nothing is logged, ticked or scored. Lives in the Avoid list.
_Avoid_: avoid habit.

**Replacement action**
What the user does in place of the urge. Belongs to a Reduce habit or an Avoid item. Shown while a *delay timer* runs.

**Later**
The state of a *paused* habit. It keeps all its data, shows no ticks, and is left out of every score, streak and review.
_Avoid_: archived, hidden.

## The day

**Day**
One calendar date in the user's local time. Every log entry belongs to one day.

**Mark**
The state of a Build habit on one day: *done* or *missed*. No mark means *blank*.

**Done**
A Build habit happened on that day. Shown with a tick.

**Missed**
The user said a Build habit did not happen on that day. Shown grey, never red. The only state that is a *miss*.

**Blank**
No mark. The app does not know what happened. A blank day is never a miss: it does not break a streak and does not start a miss rule.
_Avoid_: unmarked miss, skipped.

**Day note**
One free text per day, shared by all habits.

**Reason**
Why one Build habit was missed on one day. Belongs to one habit and one day. Shown only when that day is *missed*.
_Avoid_: excuse, note (a *day note* is different).

**Resisted urge**
One time the user felt the urge of a Reduce habit and did not act on it.
_Avoid_: win, clean.

**Slip**
One time a Reduce habit happened. Logged only when the habit has a *budget*. Shown on screen as "it happened".
_Avoid_: relapse, fail.

**Value**
The one number logged for a Number habit on one day.

## Weeks

**Week start**
The weekday a week begins on. A user setting; Sunday by default. Every weekly number follows it.

**Week**
Seven days from one *week start* to the day before the next.

**Goal**
How many done days per week a Build weekly habit aims for.

**Budget**
The most *slips* per week a Reduce habit allows. Optional.

**Target**
The weekly sum a Number habit aims for. Optional.

**This week**
Progress in the current week against the goal, budget or target ("2 / 3", "4 of 10 used").

## Progress

**Daily score**
"x / N" for one day: N is the number of active Build daily habits, x is how many of them are done.

**Total**
The all-time count for a habit: done days (Build), resisted urges (Reduce), or the sum of values (Number). The biggest number on the badge.

**Streak**
A run without a break.
- **Day streak** (Build daily): consecutive done days, broken only by a missed day.
- **Week streak** (Build weekly, Reduce with a budget): consecutive weeks with the goal met, or within budget. The current week never breaks it until the week ends.
Number habits have no streak.

**Trend**
The last 8 weeks of a habit, one bar per week.

**Milestone**
A streak length the app celebrates (7, 21, 30 … 365, then every 100).

## Timers

**Timer**
A countdown for one habit that, when it reaches its end, logs something. Only one timer runs at a time.
- **Start timer** (Build): "just start". At the end, the day is *done*.
- **Delay timer** (Reduce): "wait it out". At the end, one *resisted urge* is added.

**Settle**
What happens when a timer's end time has passed: its result is logged once, on the day the timer started. A timer stopped early never settles.
_Avoid_: complete, finish (those are what the user sees).

## Prompts

**Restart prompt**
A small prompt on the day after a missed day, for that Build daily habit. It suggests the start timer.

**Two-miss check**
When a Build daily habit is missed two days in a row, the app shows both reasons and asks: change the time, make it smaller, or keep it. The answer is not stored.
_Avoid_: intervention, penalty.

**Miss rules**
The restart prompt and the two-miss check together. On by default; can be turned off.

**Weekly review**
A card on the last day of the week: each habit against its goal, budget or target, and the week's reasons as written.

## Widgets

**Grid widget**
Home-screen widget 1: the month grid of one habit, its total and streak, and today's daily score.

**Action widget**
Home-screen widget 2: one selected habit, its total, this week, and a button that starts its timer without opening the app.

## Relationships

- A **Habit** has one **Kind**, and is either active or in **Later**.
- A **Build** habit has at most one **Mark** per **Day**; a **Reason** exists only beside a **Missed** mark.
- A **Reduce** habit has, per **Day**, a count of **resisted urges** and (with a **Budget**) a count of **slips**.
- A **Number** habit has at most one **Value** per **Day**.
- A **Timer** belongs to one habit and **settles** into one **Day**.
- The **Daily score** counts only active **Build daily** habits.

## Example dialogue

> **Dev:** "Yesterday is blank for Workout. Does today show the restart prompt?"
> **Owner:** "No. Blank is unknown, not a miss. The restart prompt follows a *missed* day only."
> **Dev:** "And if I start the delay timer for Phone scrolling at 23:55 and it ends after midnight?"
> **Owner:** "It settles on the day it started. One resisted urge on the 24th."

## Flagged ambiguities

- "Reduce" vs "Break a habit": same kind. *Reduce* in code and docs, "Break a habit" on screen.
- "It happened" (screen) = **Slip** (code and docs).
- "Habit note" was used for both the shared day note and the per-habit reason. Resolved: **Day note** is shared; **Reason** is per habit and only on a miss.
- "Pause" and "Later" mean the same state. Resolved: **Later**.
