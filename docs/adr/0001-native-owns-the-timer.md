---
status: proposed
---
# The native side owns the timer; results settle lazily

The action widget must start a timer without opening the app (R-T6), so the timer's state lives in native storage on Android, and the web layer only reads it through a bridge. The habit data still has one owner, the web layer: native code never writes marks or urges. A timer that reaches its end time is put in a "finished" list; the app **settles** that list (logs the result once, on the day the timer started) each time it starts or comes to the front. Whether a timer counts is decided by `now >= endsAt` when it is read, not by an alarm firing, so a late or blocked alarm, a denied notification permission or a killed app never loses or doubles a result.

## Considered options

- **Web owns the timer, native mirrors it.** Rejected: the widget cannot start a timer while the WebView is not running.
- **Native writes the result into the habit data.** Rejected: two writers for the same data and a second copy of the sync record format in Java.
- **Exact alarm or long foreground service to end the timer on time.** Rejected as the source of truth: exact alarms need a permission that Android 14 denies by default, and a 20-minute foreground service is outside the short-service limit. An inexact alarm is used only to post the "done" notification and refresh the widgets.

## Consequences

- Between the end time and the next app open, the widget shows the settled result by overlaying the finished list on its data (same rule as the app, tested with shared fixtures).
- In a browser there is no native side; the same `TimerPort` interface is implemented on local storage, with the same lazy rule.
