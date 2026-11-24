package app.streakcalendar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class TimerReceiver extends BroadcastReceiver {
    static final String ACTION_END = "app.streakcalendar.TIMER_END";
    static final String ACTION_STOP = "app.streakcalendar.TIMER_STOP";
    static final String ACTION_START = "app.streakcalendar.TIMER_START";
    static final String EXTRA_HABIT = "habitId";
    static final String EXTRA_KIND = "kind";
    static final String EXTRA_MINUTES = "minutes";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (ACTION_END.equals(a)) TimerStore.onEnd(ctx);
        else if (ACTION_STOP.equals(a)) TimerStore.cancel(ctx);
        else if (ACTION_START.equals(a)) start(ctx, intent);
    }

    static void start(Context ctx, Intent intent) {
        String habit = intent.getStringExtra(EXTRA_HABIT);
        if (habit == null) return;
        String kind = intent.getStringExtra(EXTRA_KIND);
        int minutes = intent.getIntExtra(EXTRA_MINUTES, 5);
        if (TimerStore.current(ctx) != null) {
            Intent ask = new Intent(ctx, TimerConflictActivity.class).putExtras(intent).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(ask);
            return;
        }
        TimerStore.start(ctx, habit, "delay".equals(kind) ? "delay" : "start", minutes);
    }
}
