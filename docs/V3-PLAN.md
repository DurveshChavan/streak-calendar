# Streak Calendar 3.0 plan

Status: **draft for review. Nothing here is built, and the released app (2.0) is unchanged.**

## How 3.0 will ship

1. Everything is built and tested as a **beta** first.
2. Only after the beta is approved does it become version 3.0.0 of the real app.
3. Proposed (needs your OK): the beta is a separate app, "Streak Calendar Beta", that installs next to the real one and has its own data, so testing can never touch your real habits.

## Ground rules

- **The current UI and UX are final.** No changes to the design, visuals or interaction patterns.
- New features reuse the existing components and styles and fit into the current flows.
- Existing habits keep working exactly as they do now.
- Everything is generic and user-defined. No habit-specific wording in the code.
- Updating must never lose data (same rule as 2.0).

## A. Confirmed feature: build and reduce habits

### A1. Habit type
- Each habit gets a type, chosen when it is created: **build** or **reduce**.
- Existing habits default to the current behaviour.

### A2. Weekly goal or limit
- **Build:** a weekly **minimum** goal (for example, at least 4 days a week).
- **Reduce:** a weekly **maximum** limit. The aim is staying within a budget, not reaching zero.

### A3. Daily logging
- **Build:** the existing yes / no (done / missed).
- **Reduce:** a **daily count**.

### A4. Progress that does not fully reset
- The current streak stays.
- Alongside it: **weekly totals** and a **longer-term trend**, so one miss does not wipe out all visible progress.

### A5. Timers
- **Reduce:** a 20-minute **delay timer**. Completing it counts as a **resisted urge**.
- **Build:** a 5-minute **"just start" timer**. Completing it marks the day as **done**.

### A6. Notes and weekly summary (optional)
- Entries can carry a short note.
- A weekly summary can surface patterns from those notes.

### A7. Process
Before any code is written: review the current data model, propose the integration with the least disruption, and **wait for approval**.

## B. Candidates from the 3.0 ideas review (not yet confirmed)

You have not yet said which of these belong in 3.0.

**Speed and memory** (measured problems in 2.0)
- Slim down saved data: about 80% of it is sync bookkeeping, kept even when sync is off.
- Save only what changed when a day is marked (marking took 113 ms in a throttled test).
- Redraw only the day being swiped; build the extra cube faces only on touch.
- Calculate holidays ahead of time so changing month into a new year is not delayed.
- Smaller widget images.

**UX**
- Daily reminder notification with Done / Missed buttons.
- Mark today from the widget.
- Year heatmap.
- First-run hints for the swipe gestures.
- Backup to a file through the Android share sheet.

**Other**
- Automated phone tests on GitHub.
- Sync server hosting (still undecided from 1.0).
- Landing page for the download link.

Two earlier ideas are now covered by section A: flexible weekly goals (A2) and progress that survives a miss (A4).

## C. Open questions to settle before building

1. **Where the new things appear.** The UI is final, but type choice, count entry, timers, weekly totals and the trend all need a place. Proposed: type and goal in the existing Habits sheet; count, timer and note in the existing day sheet; weekly totals and trend in the existing "This month" card. Needs your approval.
2. **Streak for reduce habits.** What counts as a good day: a count of zero, a count under a daily share of the weekly limit, or does the streak count weeks within budget?
3. **Count on the calendar.** How a reduce day looks in a cell (the count in place of the tick?) and what swiping it does (left = +1?).
4. **Resisted urges.** Are they counted and shown anywhere (weekly total), or just recorded?
5. **Notes.** Today a note belongs to a day, shared by all habits. The feature implies a note per habit per day. Keep old notes as day notes?
6. **Weekly summary.** "Patterns from notes" needs a definition. Simple and offline (most-used words, which weekdays had notes or high counts) or something smarter?
7. **Timers in the background.** A 20-minute timer must survive the screen turning off, which needs a notification. This is new native Android work.
8. **Trend.** Over what period (4 weeks, 12 weeks?) and shown as what (a number, an arrow, a small chart)?
9. **Widget.** What it shows for a reduce habit (count against the weekly limit in the badge?).
10. **Week start.** The calendar starts on Sunday. Do weekly goals use Sunday to Saturday?
11. **Changing type later.** Allowed after creation, or fixed?

## D. First read of the data model (to be confirmed in the A7 review)

- Today a habit is `{ id, name, marks }`, and a mark is `done` or `missed` per day.
- Likely least-disruptive change: add optional fields to a habit (`type`, weekly `goal`) and optional per-day records for counts, resisted urges and notes. A habit without the new fields behaves exactly as now.
- Backup, restore, sync and the widget all read this model, so each needs to accept the new fields and ignore them safely when absent.
