package app.streakcalendar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.util.SizeF;
import android.widget.RemoteViews;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * Transparent glass home-screen widget: streak badge + month calendar, plus the month stats and holidays when it
 * is tall (4x6 / full page). Tapping the badge switches habit; tapping anywhere else opens the app.
 * Long-press > Settings opens {@link WidgetSettingsActivity} (transparency, theme, habit).
 */
public class StreakWidgetProvider extends AppWidgetProvider {
    static final String ACTION_NEXT_HABIT = "app.streakcalendar.NEXT_HABIT";
    private static final float MAX_PIXELS = 2_000_000f; // keeps the bitmap well inside RemoteViews' memory limit

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) update(ctx, mgr, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle opts) {
        update(ctx, mgr, id);
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        for (int id : ids) WidgetPrefs.delete(ctx, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent == null ? null : intent.getAction();
        if (ACTION_NEXT_HABIT.equals(a)) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
            WidgetData data = WidgetData.parse(WidgetPrefs.data(ctx));
            WidgetPrefs p = WidgetPrefs.load(ctx, id);
            p.habitId = data.habits.get((data.indexOf(p.habitId) + 1) % data.habits.size()).id;
            p.save(ctx, id);
            update(ctx, AppWidgetManager.getInstance(ctx), id);
        } else if (Intent.ACTION_DATE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) {
            refreshAll(ctx); // new day: "today" and the streak roll over
        }
    }

    public static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (Class<?> k : new Class<?>[]{StreakWidgetProvider.class, StreakWidgetFullProvider.class}) {
            for (int id : mgr.getAppWidgetIds(new ComponentName(ctx, k))) update(ctx, mgr, id);
        }
    }

    /** The widget's size in dp: exact sizes on Android 12+, otherwise min/max for the current orientation. */
    @SuppressWarnings("deprecation")
    static float[] sizeDp(Context ctx, AppWidgetManager mgr, int id) {
        Bundle o = mgr.getAppWidgetOptions(id);
        boolean land = ctx.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        if (Build.VERSION.SDK_INT >= 31) {
            ArrayList<SizeF> sizes = o.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
            if (sizes != null && !sizes.isEmpty()) {
                SizeF best = sizes.get(0);
                for (SizeF s : sizes) if (land ? s.getWidth() > best.getWidth() : s.getHeight() > best.getHeight()) best = s;
                if (best.getWidth() > 0 && best.getHeight() > 0) return new float[]{best.getWidth(), best.getHeight()};
            }
        }
        int w = o.getInt(land ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int h = o.getInt(land ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        return new float[]{w > 0 ? w : 250, h > 0 ? h : 280};
    }

    /** Pixel size and density to render at: the real size, scaled down only if it would exceed MAX_PIXELS. */
    static float[] renderSize(Context ctx, float[] dp) {
        float density = ctx.getResources().getDisplayMetrics().density;
        float w = Math.max(160, dp[0]) * density, h = Math.max(160, dp[1]) * density;
        float scale = Math.min(1f, (float) Math.sqrt(MAX_PIXELS / (w * h)));
        return new float[]{Math.round(w * scale), Math.round(h * scale), density * scale};
    }

    static List<WidgetLayout.Op> layout(WidgetData data, WidgetPrefs p, float[] px) {
        return WidgetLayout.build(data, data.indexOf(p.habitId), new WidgetLayout.Style(p.dark(data), p.transparency / 100f),
                (int) px[0], (int) px[1], px[2], Calendar.getInstance());
    }

    static void update(Context ctx, AppWidgetManager mgr, int id) {
        try {
            WidgetData data = WidgetData.parse(WidgetPrefs.data(ctx));
            WidgetPrefs p = WidgetPrefs.load(ctx, id);
            float[] px = renderSize(ctx, sizeDp(ctx, mgr, id));
            Bitmap bmp = WidgetRenderer.render(layout(data, p, px), (int) px[0], (int) px[1]);

            RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_streak);
            rv.setImageViewBitmap(R.id.widget_image, bmp);
            WidgetData.Habit hab = data.habits.get(data.indexOf(p.habitId));
            rv.setContentDescription(R.id.widget_image, hab.name + ": " + WidgetData.currentStreak(hab.marks, WidgetData.keyOf(Calendar.getInstance())) + "-day streak");
            Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
            PendingIntent open = launch == null ? null : PendingIntent.getActivity(ctx, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (open != null) {
                rv.setOnClickPendingIntent(R.id.hit_header, open);
                rv.setOnClickPendingIntent(R.id.hit_body, open);
            }
            if (data.habits.size() > 1) {
                Intent next = new Intent(ctx, StreakWidgetProvider.class).setAction(ACTION_NEXT_HABIT).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
                rv.setOnClickPendingIntent(R.id.hit_badge, PendingIntent.getBroadcast(ctx, id, next, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            } else if (open != null) {
                rv.setOnClickPendingIntent(R.id.hit_badge, open);
            }
            mgr.updateAppWidget(id, rv);
        } catch (Throwable t) {
            // never crash the launcher over a draw failure; the previous frame stays
            Log.e("StreakWidget", "update failed", t);
        }
    }
}
