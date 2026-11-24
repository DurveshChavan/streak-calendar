package app.streakcalendar;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class WidgetRulesTest {
    private static File dir() {
        File d = new File("../../tests/fixtures/rules");
        return d.isDirectory() ? d : new File("tests/fixtures/rules");
    }

    private static JSONObject read(File f) throws Exception {
        return new JSONObject(new String(Files.readAllBytes(f.toPath()), "UTF-8"));
    }

    @Test
    public void sharedFixturesGiveTheSameNumbersAsTheApp() throws Exception {
        File[] files = dir().listFiles((d, n) -> n.endsWith(".json"));
        assertEquals(true, files != null && files.length >= 7);
        for (File f : files) {
            JSONObject fx = read(f), ex = fx.getJSONObject("expect");
            if (fx.has("habit")) {
                JSONObject doc = new JSONObject().put("v", 3).put("weekStart", fx.getInt("weekStart")).put("habits", new JSONArray().put(fx.getJSONObject("habit")));
                WidgetData d = WidgetData.parse(doc.toString());
                WidgetData.Habit h = d.habits.get(0);
                String today = fx.getString("today"), name = f.getName();
                assertEquals(name, ex.getDouble("total"), WidgetData.total(h, today), 1e-9);
                JSONObject w = ex.getJSONObject("thisWeek");
                WidgetData.Week got = d.thisWeek(h, today);
                assertEquals(name, w.getString("first"), got.first);
                assertEquals(name, w.getDouble("amount"), got.amount, 1e-9);
                assertEquals(name, w.has("of") ? w.getDouble("of") : -1, got.of, 1e-9);
                assertEquals(name, w.has("used") ? w.getDouble("used") : -1, got.used, 1e-9);
                assertEquals(name, w.isNull("met") ? null : w.getBoolean("met"), got.met);
                WidgetData.Streak s = d.streak(h, today);
                if (ex.isNull("streak")) assertNull(name, s);
                else {
                    JSONObject es = ex.getJSONObject("streak");
                    assertEquals(name, es.getInt("cur"), s.cur);
                    assertEquals(name, es.getInt("best"), s.best);
                    assertEquals(name, es.getString("unit"), s.unit);
                }
            } else {
                WidgetData d = WidgetData.parse(new JSONObject().put("v", 3).put("habits", fx.getJSONArray("habits")).toString());
                assertArrayEquals(f.getName(), new int[]{ex.getInt("done"), ex.getInt("of")}, d.dailyScore(fx.getString("day")));
            }
        }
    }

    @Test
    public void finishedTimersOverlayOnTheirStartDay() throws Exception {
        String json = "{\"v\":3,\"habits\":[{\"id\":\"h\",\"name\":\"Run\",\"marks\":{\"2026-11-24\":\"x\"}},{\"id\":\"r\",\"name\":\"Phone\",\"kind\":\"reduce\",\"marks\":{},\"urges\":{\"2026-11-24\":2}}]}";
        WidgetData d = WidgetData.parse(json);
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(2026, 10, 24, 23, 55, 0);
        long start = c.getTimeInMillis();
        TimerState s = TimerState.parse(null);
        s.start("h", "start", 5, start);
        s.finishDue(start + 300000);
        s.start("r", "delay", 20, start);
        s.finishDue(start + 1200000);
        s.start("gone", "start", 5, start);
        s.finishDue(start + 300000);
        d.overlay(s.finished);
        assertEquals("t", d.habits.get(0).marks.get("2026-11-24"));
        assertEquals(3.0, d.habits.get(1).urges.get("2026-11-24"), 1e-9);
    }

    @Test
    public void noScoreWithoutActiveDailyHabits() {
        WidgetData d = WidgetData.parse("{\"v\":3,\"habits\":[{\"id\":\"w\",\"name\":\"W\",\"kind\":\"weekly\",\"goal\":1,\"marks\":{}}]}");
        assertNull(d.dailyScore("2026-11-25"));
    }

    @Test
    public void gridFollowsTheWeekStart() {
        String[][][] g = WidgetData.monthGrid(2026, 10, 1);
        assertEquals("2026-10-26", g[0][0][0]);
        assertEquals("2026-11-01", g[0][6][0]);
        assertEquals("2026-11-01", WidgetData.monthGrid(2026, 10, 0)[0][0][0]);
    }

    @Test
    public void badgeMatchesTheApp() {
        WidgetData d = WidgetData.parse("{\"v\":3,\"habits\":["
                + "{\"id\":\"a\",\"name\":\"Run\",\"marks\":{\"2026-11-24\":\"t\",\"2026-11-25\":\"t\",\"2026-11-20\":\"t\"}},"
                + "{\"id\":\"w\",\"name\":\"Speak\",\"kind\":\"weekly\",\"goal\":1,\"marks\":{\"2026-11-24\":\"t\"}},"
                + "{\"id\":\"r\",\"name\":\"Phone\",\"kind\":\"reduce\",\"marks\":{},\"urges\":{\"2026-11-25\":4}},"
                + "{\"id\":\"n\",\"name\":\"Pages\",\"kind\":\"number\",\"unit\":\"pages\",\"marks\":{},\"values\":{\"2026-11-25\":12.5}}]}");
        String t = "2026-11-25";
        assertEquals("3|streak 3", d.badge(d.habits.get(0), t));
        assertEquals("1|1 wk streak", d.badge(d.habits.get(1), t));
        assertEquals("4|urges resisted", d.badge(d.habits.get(2), t));
        assertEquals("12.5|pages in total", d.badge(d.habits.get(3), t));
    }
}
