package app.streakcalendar;

import android.content.Context;
import android.content.SharedPreferences;

/** Settings for one placed widget (each widget on the home screen has its own). */
final class WidgetPrefs {
    static final String FILE = "streakcal_widget"; // also holds the data the app pushes
    static final String DATA = "data";
    static final String THEME_APP = "app", THEME_LIGHT = "light", THEME_DARK = "dark";
    static final int DEFAULT_TRANSPARENCY = 70;

    int transparency = DEFAULT_TRANSPARENCY; // 0 = solid glass, 100 = no background at all
    String theme = THEME_APP;
    String habitId;

    static SharedPreferences sp(Context ctx) {
        return ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    static String data(Context ctx) {
        return sp(ctx).getString(DATA, null);
    }

    static WidgetPrefs load(Context ctx, int id) {
        SharedPreferences sp = sp(ctx);
        WidgetPrefs p = new WidgetPrefs();
        p.transparency = Math.max(0, Math.min(100, sp.getInt("w" + id + ".transparency", DEFAULT_TRANSPARENCY)));
        p.theme = sp.getString("w" + id + ".theme", THEME_APP);
        p.habitId = sp.getString("w" + id + ".habit", null);
        return p;
    }

    void save(Context ctx, int id) {
        sp(ctx).edit().putInt("w" + id + ".transparency", transparency).putString("w" + id + ".theme", theme).putString("w" + id + ".habit", habitId).apply();
    }

    static void delete(Context ctx, int id) {
        sp(ctx).edit().remove("w" + id + ".transparency").remove("w" + id + ".theme").remove("w" + id + ".habit").apply();
    }

    boolean dark(WidgetData data) {
        return THEME_DARK.equals(theme) || (THEME_APP.equals(theme) && data.dark);
    }
}
