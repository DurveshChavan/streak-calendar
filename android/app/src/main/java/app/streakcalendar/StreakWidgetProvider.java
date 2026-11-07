package app.streakcalendar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.widget.RemoteViews;

/** Transparent glass home-screen widget: month calendar + habit-1 streak. Tapping it opens the app. */
public class StreakWidgetProvider extends AppWidgetProvider {
    public static final String PREFS = "streakcal_widget";
    public static final String KEY = "data";
    private static final int MAX_PIXELS = 1_800_000; // keeps the bitmap well inside RemoteViews' memory limit

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) update(ctx, mgr, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle opts) {
        update(ctx, mgr, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent == null ? null : intent.getAction();
        // new day / clock or timezone change: redraw so "today" and the streak roll over
        if (Intent.ACTION_DATE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) refreshAll(ctx);
    }

    public static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, StreakWidgetProvider.class));
        for (int id : ids) update(ctx, mgr, id);
    }

    static void update(Context ctx, AppWidgetManager mgr, int id) {
        try {
            DisplayMetrics dm = ctx.getResources().getDisplayMetrics();
            Bundle o = mgr.getAppWidgetOptions(id);
            boolean land = ctx.getResources().getConfiguration().orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE;
            int wDp = o.getInt(land ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
            int hDp = o.getInt(land ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 250);
            float w = Math.max(160, wDp) * dm.density, h = Math.max(160, hDp) * dm.density, density = dm.density;
            float scale = Math.min(1f, (float) Math.sqrt(MAX_PIXELS / (w * h)));
            w *= scale; h *= scale; density *= scale;

            SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            WidgetData data = WidgetData.parse(sp.getString(KEY, null));
            Bitmap bmp = WidgetRenderer.render(data, Math.round(w), Math.round(h), density);

            RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_streak);
            rv.setImageViewBitmap(R.id.widget_image, bmp);
            Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
            if (launch != null) {
                PendingIntent pi = PendingIntent.getActivity(ctx, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                rv.setOnClickPendingIntent(R.id.widget_image, pi);
            }
            mgr.updateAppWidget(id, rv);
        } catch (Throwable t) {
            // never crash the launcher host over a draw failure; keep the previous frame
            android.util.Log.e("StreakWidget", "update failed", t);
        }
    }
}
