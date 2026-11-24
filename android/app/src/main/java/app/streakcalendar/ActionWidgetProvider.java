package app.streakcalendar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import java.util.Calendar;

public class ActionWidgetProvider extends AppWidgetProvider {
    static final String ACTION_NEXT = "app.streakcalendar.ACTION_WIDGET_NEXT";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) update(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if (ACTION_NEXT.equals(a)) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1);
            if (id < 0) return;
            WidgetData data = WidgetData.parse(WidgetPrefs.data(ctx));
            int i = data.indexOf(habitId(ctx, id));
            for (int step = 1; step <= data.habits.size(); step++) {
                WidgetData.Habit h = data.habits.get((i + step) % data.habits.size());
                if (!h.later) {
                    WidgetPrefs.sp(ctx).edit().putString("a" + id + ".habit", h.id).apply();
                    break;
                }
            }
            update(ctx, AppWidgetManager.getInstance(ctx), id);
        } else if (Intent.ACTION_DATE_CHANGED.equals(a)) {
            refreshAll(ctx);
        }
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        for (int id : ids) WidgetPrefs.sp(ctx).edit().remove("a" + id + ".habit").apply();
    }

    private static String habitId(Context ctx, int id) {
        return WidgetPrefs.sp(ctx).getString("a" + id + ".habit", null);
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (int id : mgr.getAppWidgetIds(new ComponentName(ctx, ActionWidgetProvider.class))) update(ctx, mgr, id);
    }

    static void update(Context ctx, AppWidgetManager mgr, int id) {
        WidgetData data = WidgetData.parse(WidgetPrefs.data(ctx));
        data.overlay(TimerStore.finished(ctx));
        WidgetData.Habit h = data.habits.get(data.indexOf(habitId(ctx, id)));
        if (h.later) for (WidgetData.Habit x : data.habits) if (!x.later) { h = x; break; }
        boolean dark = data.dark;
        int ink = dark ? 0xFFF4F6FA : 0xFF14161A;
        String[] t = data.actionText(h, WidgetData.keyOf(Calendar.getInstance()));

        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_action);
        rv.setInt(R.id.action_root, "setBackgroundResource", dark ? R.drawable.widget_action_bg_dark : R.drawable.widget_action_bg_light);
        for (int v : new int[]{R.id.action_name, R.id.action_total, R.id.action_line, R.id.action_clock}) rv.setTextColor(v, ink);
        rv.setTextViewText(R.id.action_name, t[0]);
        rv.setTextViewText(R.id.action_total, t[1]);
        rv.setTextViewText(R.id.action_line, t[2]);

        Intent next = new Intent(ctx, ActionWidgetProvider.class).setAction(ACTION_NEXT).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        rv.setOnClickPendingIntent(R.id.action_name, PendingIntent.getBroadcast(ctx, 1000 + id, next, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch != null) rv.setOnClickPendingIntent(R.id.action_total, PendingIntent.getActivity(ctx, 3000 + id, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        TimerState.Timer running = TimerStore.current(ctx);
        if (running != null && running.habitId.equals(h.id)) {
            rv.setViewVisibility(R.id.action_clock, View.VISIBLE);
            rv.setChronometer(R.id.action_clock, SystemClock.elapsedRealtime() + (running.endsAt - System.currentTimeMillis()), null, true);
            if (Build.VERSION.SDK_INT >= 24) rv.setChronometerCountDown(R.id.action_clock, true);
            rv.setTextViewText(R.id.action_button, "Stop");
            rv.setViewVisibility(R.id.action_button, View.VISIBLE);
            Intent stop = new Intent(ctx, TimerReceiver.class).setAction(TimerReceiver.ACTION_STOP);
            rv.setOnClickPendingIntent(R.id.action_button, PendingIntent.getBroadcast(ctx, 2000 + id, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        } else {
            rv.setViewVisibility(R.id.action_clock, View.GONE);
            if (t[3].isEmpty()) rv.setViewVisibility(R.id.action_button, View.GONE);
            else {
                rv.setViewVisibility(R.id.action_button, View.VISIBLE);
                rv.setTextViewText(R.id.action_button, t[3]);
                Intent start = new Intent(ctx, TimerReceiver.class).setAction(TimerReceiver.ACTION_START)
                        .putExtra(TimerReceiver.EXTRA_HABIT, h.id)
                        .putExtra(TimerReceiver.EXTRA_KIND, "reduce".equals(h.kind) ? "delay" : "start")
                        .putExtra(TimerReceiver.EXTRA_MINUTES, WidgetData.timerMinutes(h));
                rv.setOnClickPendingIntent(R.id.action_button, PendingIntent.getBroadcast(ctx, 2000 + id, start, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
        }
        mgr.updateAppWidget(id, rv);
    }
}
