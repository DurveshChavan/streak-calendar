# Widgets

## Sub-features
- Grid widget: month grid of one habit, total badge + streak, grey miss, week start, holidays, "PROGRESS" card.
- Action widget: one habit, name, total, this-week line, Start/Stop timer button, finished-timer overlay.

## How to get to it (user POV)
Long-press the home screen → Widgets → Streak Calendar → place grid or action widget. It updates whenever the app saves.

## Driving it with widget.sh
- Run any app journey first; it writes `doc.json`. Then `widget.sh <doc.json> <out> light|dark <habitIndex>`.
- The helper turns the doc into the app's real payload (`src/lib/widgetPayload.ts`), feeds it to the real `WidgetData`/`WidgetLayout` Java, and paints `widget-grid-4x4-<mode>.png`. `widget-action.txt` holds `actionText()` per habit.
- Proof: grid PNG shows the same marks, total and streak as the app screenshot from the same doc; action line matches "Today/this week" rules for the kind.

## Gotchas
- `WidgetData` depends on `TimerState`; compile all three (`widget.sh` and `tools/widget-preview/make-previews.sh` both do).
- Not proven here: RemoteViews inflation, action widget XML layout, tap intents, timer notification, conflict activity, real launcher sizes. Those need the phone (see SKILL.md "Device").
- `render.cjs` draws with the `app` backdrop; transparency fixed at 70.
