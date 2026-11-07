package app.streakcalendar;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * Pure-Java model for the home-screen widget (no Android dependencies, so it is unit-testable on a plain JVM).
 * Same rules as the app: only a missed day (x) breaks a streak, unmarked days neither extend nor break it,
 * and marks after today are ignored.
 */
public final class WidgetData {
    public static final String[] MONTHS = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};
    private static final String[] WD = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};

    public static final class Habit {
        public final String id;
        public final String name;
        public final TreeMap<String, String> marks = new TreeMap<>();

        Habit(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    public final List<Habit> habits = new ArrayList<>();
    /** The app's own theme ("Match app" in the widget settings). */
    public final boolean dark;
    /** yyyy-MM-dd -> holiday name(s), pushed by the app for roughly the coming year. */
    public final TreeMap<String, String> holidays = new TreeMap<>();

    private WidgetData(boolean dark) {
        this.dark = dark;
    }

    /**
     * Parses what the app pushes: {theme, habits:[{id,name,marks}], hol:{day:name}}.
     * Also reads the 1.0 format {name, marks, theme}. Never throws; falls back to one empty "Habit 1".
     */
    public static WidgetData parse(String json) {
        WidgetData d;
        try {
            JSONObject o = new JSONObject(json == null ? "{}" : json);
            d = new WidgetData("dark".equals(o.optString("theme", "light")));
            JSONArray hs = o.optJSONArray("habits");
            if (hs != null) {
                for (int i = 0; i < hs.length(); i++) {
                    JSONObject h = hs.optJSONObject(i);
                    if (h == null || h.optString("id", "").isEmpty()) continue;
                    d.habits.add(readMarks(new Habit(h.optString("id"), h.optString("name", "Habit")), h.optJSONObject("marks")));
                }
            } else if (o.has("marks")) {
                d.habits.add(readMarks(new Habit("h1", o.optString("name", "Habit 1")), o.optJSONObject("marks")));
            }
            JSONObject hol = o.optJSONObject("hol");
            if (hol != null) {
                Iterator<String> it = hol.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    if (isDay(k)) d.holidays.put(k, hol.optString(k, ""));
                }
            }
        } catch (JSONException e) {
            d = new WidgetData(false);
        }
        if (d.habits.isEmpty()) d.habits.add(new Habit("h1", "Habit 1"));
        return d;
    }

    private static Habit readMarks(Habit h, JSONObject m) {
        if (m == null) return h;
        Iterator<String> it = m.keys();
        while (it.hasNext()) {
            String k = it.next();
            String v = m.optString(k, "");
            if (("t".equals(v) || "x".equals(v)) && isDay(k)) h.marks.put(k, v);
        }
        return h;
    }

    private static boolean isDay(String k) {
        return k.matches("\\d{4}-\\d{2}-\\d{2}");
    }

    /** Index of the habit with this id, or 0 (the first habit) if it no longer exists. */
    public int indexOf(String id) {
        for (int i = 0; i < habits.size(); i++) if (habits.get(i).id.equals(id)) return i;
        return 0;
    }

    public static String keyOf(Calendar c) {
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    /** Current streak as of {@code today} (yyyy-MM-dd). */
    public static int currentStreak(Map<String, String> marks, String today) {
        int run = 0;
        for (Map.Entry<String, String> e : marks.entrySet()) {
            if (e.getKey().compareTo(today) > 0) break;
            if ("t".equals(e.getValue())) run++; else run = 0;
        }
        return run;
    }

    /** Longest streak up to {@code today}. */
    public static int bestStreak(Map<String, String> marks, String today) {
        int run = 0, best = 0;
        for (Map.Entry<String, String> e : marks.entrySet()) {
            if (e.getKey().compareTo(today) > 0) break;
            if ("t".equals(e.getValue())) best = Math.max(best, ++run); else run = 0;
        }
        return best;
    }

    /** {done, missed} in the given month. */
    public static int[] monthCounts(Map<String, String> marks, int year, int month0) {
        String pre = String.format(Locale.US, "%04d-%02d-", year, month0 + 1);
        int done = 0, missed = 0;
        for (Map.Entry<String, String> e : marks.entrySet()) {
            if (!e.getKey().startsWith(pre)) continue;
            if ("t".equals(e.getValue())) done++; else missed++;
        }
        return new int[]{done, missed};
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

    /** Up to {@code max} holidays from today on, each {label like "Sun, 8 Nov · in 2 days", name}. */
    public List<String[]> upcoming(Calendar today, int max) {
        List<String[]> out = new ArrayList<>();
        String t = keyOf(today);
        Calendar t0 = (Calendar) today.clone();
        t0.set(Calendar.HOUR_OF_DAY, 12);
        t0.set(Calendar.MINUTE, 0);
        t0.set(Calendar.SECOND, 0);
        t0.set(Calendar.MILLISECOND, 0);
        for (Map.Entry<String, String> e : holidays.tailMap(t, true).entrySet()) {
            if (out.size() >= max) break;
            String[] p = e.getKey().split("-");
            Calendar d = (Calendar) t0.clone();
            d.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]));
            long diff = Math.round((d.getTimeInMillis() - t0.getTimeInMillis()) / 86400000.0);
            String when = WD[d.get(Calendar.DAY_OF_WEEK) - 1] + ", " + d.get(Calendar.DAY_OF_MONTH) + " " + MONTHS[d.get(Calendar.MONTH)].substring(0, 3)
                    + (diff == 0 ? " · today" : diff == 1 ? " · tomorrow" : diff < 31 ? " · in " + diff + " days" : "");
            out.add(new String[]{when, e.getValue()});
        }
        return out;
    }
}
