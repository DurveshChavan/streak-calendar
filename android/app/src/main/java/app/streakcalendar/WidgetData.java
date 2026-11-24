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
public final class WidgetData {
    public static final String[] MONTHS = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};
    private static final String[] WD = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};

    public static final class Habit {
        public final String id;
        public final String name;
        public String kind = "daily";
        public int goal = 1;
        public int budget;
        public double target;
        public String unit = "";
        public int timerMin;
        public boolean later;
        public final TreeMap<String, String> marks = new TreeMap<>();
        public final TreeMap<String, Double> urges = new TreeMap<>();
        public final TreeMap<String, Double> slips = new TreeMap<>();
        public final TreeMap<String, Double> values = new TreeMap<>();

        Habit(String id, String name) {
            this.id = id;
            this.name = name;
        }
    }

    public final List<Habit> habits = new ArrayList<>();
    public final boolean dark;
    public final TreeMap<String, String> holidays = new TreeMap<>();
    public int weekStart;

    public static final class Week {
        public final String first;
        public final double amount;
        public final double of;
        public final double used;
        public final Boolean met;

        Week(String first, double amount, double of, double used, Boolean met) {
            this.first = first;
            this.amount = amount;
            this.of = of;
            this.used = used;
            this.met = met;
        }
    }

    public static final class Streak {
        public final int cur;
        public final int best;
        public final String unit;

        Streak(int cur, int best, String unit) {
            this.cur = cur;
            this.best = best;
            this.unit = unit;
        }
    }

    private WidgetData(boolean dark) {
        this.dark = dark;
    }
    public static WidgetData parse(String json) {
        WidgetData d;
        try {
            JSONObject o = new JSONObject(json == null ? "{}" : json);
            d = new WidgetData("dark".equals(o.optString("theme", "light")));
            d.weekStart = Math.max(0, Math.min(6, o.optInt("weekStart", 0)));
            JSONArray hs = o.optJSONArray("habits");
            if (hs != null) {
                for (int i = 0; i < hs.length(); i++) {
                    JSONObject h = hs.optJSONObject(i);
                    if (h == null || h.optString("id", "").isEmpty()) continue;
                    d.habits.add(readHabit(h));
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

    private static Habit readHabit(JSONObject o) {
        Habit h = readMarks(new Habit(o.optString("id"), o.optString("name", "Habit")), o.optJSONObject("marks"));
        String k = o.optString("kind", "daily");
        h.kind = k.equals("weekly") || k.equals("reduce") || k.equals("number") ? k : "daily";
        h.goal = Math.max(1, o.optInt("goal", 1));
        h.budget = Math.max(0, o.optInt("budget", 0));
        h.target = Math.max(0, o.optDouble("target", 0));
        h.unit = o.optString("unit", "");
        h.timerMin = Math.max(0, o.optInt("timerMin", 0));
        h.later = o.optBoolean("later", false);
        readNumbers(h.urges, o.optJSONObject("urges"));
        readNumbers(h.slips, o.optJSONObject("slips"));
        readNumbers(h.values, o.optJSONObject("values"));
        return h;
    }

    private static void readNumbers(TreeMap<String, Double> into, JSONObject m) {
        if (m == null) return;
        Iterator<String> it = m.keys();
        while (it.hasNext()) {
            String k = it.next();
            double v = m.optDouble(k, Double.NaN);
            if (isDay(k) && !Double.isNaN(v) && !Double.isInfinite(v)) into.put(k, v);
        }
    }

    private static Calendar cal(String key) {
        String[] p = key.split("-");
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]), 12, 0, 0);
        return c;
    }

    public static String addDays(String key, int n) {
        Calendar c = cal(key);
        c.add(Calendar.DAY_OF_MONTH, n);
        return keyOf(c);
    }

    public static String weekOf(String key, int ws) {
        int dow = cal(key).get(Calendar.DAY_OF_WEEK) - 1;
        return addDays(key, -((dow - ws + 7) % 7));
    }

    private static double sum(TreeMap<String, Double> m, String from, String to) {
        double n = 0;
        for (Map.Entry<String, Double> e : m.subMap(from, true, to, true).entrySet()) n += e.getValue();
        return n;
    }

    private static int done(Habit h, String from, String to) {
        int n = 0;
        for (Map.Entry<String, String> e : h.marks.subMap(from, true, to, true).entrySet()) if ("t".equals(e.getValue())) n++;
        return n;
    }

    public static double total(Habit h, String today) {
        if ("reduce".equals(h.kind)) return sum(h.urges, "0000-00-00", today);
        if ("number".equals(h.kind)) return sum(h.values, "0000-00-00", today);
        return done(h, "0000-00-00", today);
    }

    static Week weekStats(Habit h, String first, String today) {
        String last = addDays(first, 6), to = last.compareTo(today) < 0 ? last : today;
        if ("reduce".equals(h.kind)) {
            double amount = sum(h.urges, first, to);
            if (h.budget <= 0) return new Week(first, amount, -1, -1, null);
            double used = sum(h.slips, first, to);
            return new Week(first, amount, h.budget, used, used <= h.budget);
        }
        if ("number".equals(h.kind)) {
            double amount = sum(h.values, first, to);
            return h.target > 0 ? new Week(first, amount, h.target, -1, amount >= h.target) : new Week(first, amount, -1, -1, null);
        }
        int amount = done(h, first, to);
        if ("weekly".equals(h.kind)) return new Week(first, amount, h.goal, -1, amount >= h.goal);
        return new Week(first, amount, 7, -1, null);
    }

    public Week thisWeek(Habit h, String today) {
        return weekStats(h, weekOf(today, weekStart), today);
    }

    public Streak streak(Habit h, String today) {
        if ("daily".equals(h.kind)) return new Streak(currentStreak(h.marks, today), bestStreak(h.marks, today), "day");
        if ("number".equals(h.kind) || ("reduce".equals(h.kind) && h.budget <= 0)) return null;
        String start = null;
        for (TreeMap<String, ?> m : java.util.Arrays.<TreeMap<String, ?>>asList(h.marks, h.urges, h.slips))
            if (!m.isEmpty() && (start == null || m.firstKey().compareTo(start) < 0)) start = m.firstKey();
        String cur = weekOf(today, weekStart);
        int run = 0, best = 0;
        for (String f = start == null ? cur : weekOf(start, weekStart); f.compareTo(cur) <= 0; f = addDays(f, 7)) {
            Week w = weekStats(h, f, today);
            if ("reduce".equals(h.kind) && w.amount == 0 && w.used <= 0) continue;
            if (Boolean.TRUE.equals(w.met)) run++;
            else if (!f.equals(cur)) run = 0;
            best = Math.max(best, run);
        }
        return new Streak(run, best, "week");
    }

    public static String number(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    public String badge(Habit h, String today) {
        String total = number(total(h, today));
        Streak s = streak(h, today);
        if (s != null) return total + "|" + ("day".equals(s.unit) ? "streak " + s.cur : s.cur + " wk streak");
        if ("reduce".equals(h.kind)) return total + "|urges resisted";
        return total + "|" + (h.unit.isEmpty() ? "" : h.unit + " ") + "in total";
    }

    public int[] dailyScore(String day) {
        int done = 0, of = 0;
        for (Habit h : habits) {
            if (!"daily".equals(h.kind) || h.later) continue;
            of++;
            if ("t".equals(h.marks.get(day))) done++;
        }
        return of == 0 ? null : new int[]{done, of};
    }

    public void overlay(List<TimerState.Timer> finished) {
        for (TimerState.Timer t : finished) {
            Habit h = null;
            for (Habit x : habits) if (x.id.equals(t.habitId)) h = x;
            if (h == null || h.later) continue;
            Calendar c = Calendar.getInstance();
            c.setTimeInMillis(t.startedAt);
            String day = keyOf(c);
            if ("delay".equals(t.kind)) h.urges.put(day, h.urges.getOrDefault(day, 0.0) + 1);
            else h.marks.put(day, "t");
        }
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
    public int indexOf(String id) {
        for (int i = 0; i < habits.size(); i++) if (habits.get(i).id.equals(id)) return i;
        return 0;
    }

    public static String keyOf(Calendar c) {
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }
    public static int currentStreak(Map<String, String> marks, String today) {
        int run = 0;
        for (Map.Entry<String, String> e : marks.entrySet()) {
            if (e.getKey().compareTo(today) > 0) break;
            if ("t".equals(e.getValue())) run++; else run = 0;
        }
        return run;
    }
    public static int bestStreak(Map<String, String> marks, String today) {
        int run = 0, best = 0;
        for (Map.Entry<String, String> e : marks.entrySet()) {
            if (e.getKey().compareTo(today) > 0) break;
            if ("t".equals(e.getValue())) best = Math.max(best, ++run); else run = 0;
        }
        return best;
    }
    public static int[] monthCounts(Map<String, String> marks, int year, int month0) {
        String pre = String.format(Locale.US, "%04d-%02d-", year, month0 + 1);
        int done = 0, missed = 0;
        for (Map.Entry<String, String> e : marks.entrySet()) {
            if (!e.getKey().startsWith(pre)) continue;
            if ("t".equals(e.getValue())) done++; else missed++;
        }
        return new int[]{done, missed};
    }
    public static int nextMilestone(int n) {
        int[] ms = {7, 21, 30, 50, 100, 150, 200, 250, 300, 365};
        for (int m : ms) if (m > n) return m;
        return (n / 100 + 1) * 100;
    }
    public static String[][][] monthGrid(int year, int month0) {
        return monthGrid(year, month0, 0);
    }

    public static String[][][] monthGrid(int year, int month0, int ws) {
        Calendar first = Calendar.getInstance();
        first.clear();
        first.set(year, month0, 1);
        int offset = (first.get(Calendar.DAY_OF_WEEK) - 1 - ws + 7) % 7;
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
