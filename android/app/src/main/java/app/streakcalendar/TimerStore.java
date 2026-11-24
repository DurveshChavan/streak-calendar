package app.streakcalendar;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

final class TimerStore {
    private static final String FILE = "streakcal_timer";
    private static final String KEY = "state";

    private TimerStore() {
    }

    private static SharedPreferences sp(Context ctx) {
        return ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    static synchronized TimerState load(Context ctx) {
        return TimerState.parse(sp(ctx).getString(KEY, null));
    }

    private static void save(Context ctx, TimerState s) {
        sp(ctx).edit().putString(KEY, s.toJson()).apply();
    }

    static synchronized TimerState.Timer current(Context ctx) {
        TimerState s = load(ctx);
        TimerState.Timer t = s.current(System.currentTimeMillis());
        save(ctx, s);
        return t;
    }

    static synchronized TimerState.Timer start(Context ctx, String habitId, String kind, int minutes) {
        TimerState s = load(ctx);
        TimerState.Timer t = s.start(habitId, kind, minutes, System.currentTimeMillis());
        save(ctx, s);
        TimerNotifier.showRunning(ctx, t, habitName(ctx, habitId));
        schedule(ctx, t.endsAt);
        StreakWidgetProvider.refreshAll(ctx);
        return t;
    }

    static synchronized void cancel(Context ctx) {
        TimerState s = load(ctx);
        s.cancel();
        save(ctx, s);
        TimerNotifier.clear(ctx);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(endIntent(ctx));
        StreakWidgetProvider.refreshAll(ctx);
    }

    static synchronized JSONArray drain(Context ctx) {
        TimerState s = load(ctx);
        JSONArray out = s.drain(System.currentTimeMillis());
        save(ctx, s);
        return out;
    }

    static synchronized void onEnd(Context ctx) {
        TimerState s = load(ctx);
        int before = s.finished.size();
        s.finishDue(System.currentTimeMillis());
        save(ctx, s);
        if (s.finished.size() > before) {
            TimerState.Timer t = s.finished.get(s.finished.size() - 1);
            TimerNotifier.showDone(ctx, t, habitName(ctx, t.habitId));
        }
        StreakWidgetProvider.refreshAll(ctx);
    }

    static synchronized java.util.List<TimerState.Timer> finished(Context ctx) {
        TimerState s = load(ctx);
        s.finishDue(System.currentTimeMillis());
        return new java.util.ArrayList<>(s.finished);
    }

    static String habitName(Context ctx, String id) {
        try {
            JSONArray hs = new JSONObject(WidgetPrefs.data(ctx)).optJSONArray("habits");
            if (hs != null) for (int i = 0; i < hs.length(); i++) {
                JSONObject h = hs.optJSONObject(i);
                if (h != null && id.equals(h.optString("id"))) return h.optString("name", "Habit");
            }
        } catch (Exception ignored) {
        }
        return "Habit";
    }

    private static PendingIntent endIntent(Context ctx) {
        Intent i = new Intent(ctx, TimerReceiver.class).setAction(TimerReceiver.ACTION_END);
        return PendingIntent.getBroadcast(ctx, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void schedule(Context ctx, long at) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, endIntent(ctx));
    }
}
