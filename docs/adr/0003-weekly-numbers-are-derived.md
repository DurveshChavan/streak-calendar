---
status: proposed
---
# Weekly numbers are computed from day entries, never stored

"This week", week streaks, the trend and the weekly review are all computed when needed from the per-day entries (marks, urges, slips, values) and the current week start. Nothing keyed by week is stored or synced. The week start is a setting that can change at any time (R-W1), and two devices can log the same week; stored week buckets would need a rebuild on every change and could disagree across devices. The cost is a scan of a habit's days on each render, which is small (one entry per day, a few thousand at most) and is memoised per habit and week start.
