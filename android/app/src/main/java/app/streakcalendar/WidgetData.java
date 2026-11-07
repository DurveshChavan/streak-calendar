package app.streakcalendar;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Iterator;
import java.util.Locale;
import java.util.TreeMap;

/**
 * Pure-Java model for the home-screen widget (no Android dependencies, unit-testable on a plain JVM).
 * Mirrors the web app's rules: only a missed day (x) breaks a streak, unmarked days neither extend nor break it,
 * and marks after today are ignored.
 */
public final class WidgetData {
    public static final String[] MONTHS = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};

    public final String name;
    public final boolean dark;
    public final TreeMap<String, String> marks = new TreeMap<>();

    public WidgetData(String name, boolean dark) {
        this.name = name;
        this.dark = dark;
    }

    /** Parses the JSON the web layer pushes: {name, marks:{yyyy-MM-dd:'t'|'x'}, theme:'light'|'dark'}. Never throws. */
    public static WidgetData parse(String json) {
        if (json == null || json.isEmpty()) return new WidgetData("Habit 1", false);
        try {
            JSONObject o = new JSONObject(json);
            WidgetData d = new WidgetData(o.optString("name", "Habit 1"), "dark".equals(o.optString("theme", "light")));
            JSONObject m = o.optJSONObject("marks");
            if (m != null) {
                Iterator<String> it = m.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    String v = m.optString(k, "");
                    if (("t".equals(v) || "x".equals(v)) && k.matches("\\d{4}-\\d{2}-\\d{2}")) d.marks.put(k, v);
                }
            }
            return d;
        } catch (JSONException e) {
            return new WidgetData("Habit 1", false);
        }
    }

    public static String keyOf(Calendar c) {
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    /** Current streak as of {@code today} (yyyy-MM-dd). */
    public int currentStreak(String today) {
        int run = 0;
        for (java.util.Map.Entry<String, String> e : marks.entrySet()) {
            if (e.getKey().compareTo(today) > 0) break;
            if ("t".equals(e.getValue())) run++; else run = 0;
        }
        return run;
    }

    /** Next milestone above n: 7, 21, 30, 50, 100, 150, 200, 250, 300, 365, then every 100. */
    public static int nextMilestone(int n) {
        int[] ms = {7, 21, 30, 50, 100, 150, 200, 250, 300, 365};
        for (int m : ms) if (m > n) return m;
        return (n / 100 + 1) * 100;
    }

    /**
     * The 6-week x 7-day month grid, Sunday-first, as the app shows it: index [week][weekday].
     * Each cell is {yyyy-MM-dd key, day-of-month, inMonth(1/0)}.
     */
    public static String[][][] monthGrid(int year, int month0) {
        Calendar first = Calendar.getInstance();
        first.clear();
        first.set(year, month0, 1);
        int offset = first.get(Calendar.DAY_OF_WEEK) - 1; // Sunday = 0
        String[][][] g = new String[6][7][];
        for (int c = 0; c < 6; c++) {
            for (int r = 0; r < 7; r++) {
                Calendar d = (Calendar) first.clone();
                d.add(Calendar.DAY_OF_MONTH, c * 7 + r - offset);
                g[c][r] = new String[]{keyOf(d), String.valueOf(d.get(Calendar.DAY_OF_MONTH)), d.get(Calendar.MONTH) == month0 ? "1" : "0"};
            }
        }
        return g;
    }
}
