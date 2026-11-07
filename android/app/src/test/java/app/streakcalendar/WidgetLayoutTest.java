package app.streakcalendar;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.Calendar;
import java.util.List;

public class WidgetLayoutTest {
    private static final String DATA = "{\"theme\":\"light\",\"habits\":["
            + "{\"id\":\"h1\",\"name\":\"Habit 1\",\"marks\":{\"2026-11-01\":\"t\",\"2026-11-02\":\"t\",\"2026-11-03\":\"x\",\"2026-11-04\":\"t\",\"2026-11-05\":\"t\",\"2026-11-30\":\"t\",\"bad\":\"t\"}},"
            + "{\"id\":\"h2\",\"name\":\"Read\",\"marks\":{}}],"
            + "\"hol\":{\"2026-11-24\":\"Guru Nanak Jayanti\",\"2026-12-25\":\"Christmas\"}}";

    private static Calendar day(int y, int m, int d) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(y, m - 1, d, 12, 0, 0);
        return c;
    }

    @Test
    public void parsesBothFormatsAndNeverFails() {
        WidgetData d = WidgetData.parse(DATA);
        assertEquals(2, d.habits.size());
        assertEquals(6, d.habits.get(0).marks.size()); // the invalid key is dropped
        WidgetData v1 = WidgetData.parse("{\"name\":\"Run\",\"theme\":\"dark\",\"marks\":{\"2026-11-01\":\"t\"}}");
        assertEquals("Run", v1.habits.get(0).name);
        assertTrue(v1.dark);
        assertEquals("Habit 1", WidgetData.parse(null).habits.get(0).name);
        assertEquals("Habit 1", WidgetData.parse("not json").habits.get(0).name);
        assertEquals(0, d.indexOf("deleted-habit"));
        assertEquals(1, d.indexOf("h2"));
    }

    @Test
    public void streaksAndMonthStats() {
        WidgetData.Habit h = WidgetData.parse(DATA).habits.get(0);
        assertEquals(2, WidgetData.currentStreak(h.marks, "2026-11-18")); // the 30th is in the future
        assertEquals(2, WidgetData.bestStreak(h.marks, "2026-11-18"));
        int[] c = WidgetData.monthCounts(h.marks, 2026, 10);
        assertEquals(5, c[0]);
        assertEquals(1, c[1]);
        assertEquals(7, WidgetData.nextMilestone(0));
        assertEquals(400, WidgetData.nextMilestone(365));
    }

    @Test
    public void upcomingHolidayLabels() {
        List<String[]> up = WidgetData.parse(DATA).upcoming(day(2026, 11, 18), 4);
        assertEquals(2, up.size());
        assertEquals("Tue, 24 Nov · in 6 days", up.get(0)[0]);
        assertEquals("Fri, 25 Dec", up.get(1)[0]);
    }

    private static List<WidgetLayout.Op> layout(float wDp, float hDp, float transparency) {
        float d = 2.8125f;
        return WidgetLayout.build(WidgetData.parse(DATA), 0, new WidgetLayout.Style(false, transparency), Math.round(wDp * d), Math.round(hDp * d), d, day(2026, 11, 18));
    }

    private static boolean hasText(List<WidgetLayout.Op> ops, String s) {
        for (WidgetLayout.Op o : ops) if (o.type == WidgetLayout.TEXT && s.equals(o.text)) return true;
        return false;
    }

    @Test
    public void fullPageAddsCardsOnlyWhenTall() {
        assertTrue(hasText(layout(370, 684, .7f), "THIS MONTH"));
        assertFalse(hasText(layout(370, 456, .7f), "THIS MONTH"));
    }

    @Test
    public void everythingStaysInsideTheWidgetAndBadgeInsideItsTapArea() {
        float d = 2.8125f, w = 370 * d, h = 684 * d;
        boolean badge = false;
        for (WidgetLayout.Op o : layout(370, 684, .7f)) {
            if (o.type == WidgetLayout.RECT) {
                assertTrue(o.l >= -0.5f && o.t >= -0.5f && o.r <= w + 0.5f && o.b <= h + 0.5f);
                if (o.fill == WidgetLayout.argb(0xFFD700, 1) && o.t < WidgetLayout.HEADER_DP * d) { // the badge (today's cell is yellow too)
                    badge = true;
                    assertTrue(o.l >= w - WidgetLayout.BADGE_HIT_DP * d);
                    assertTrue(o.b <= WidgetLayout.HEADER_DP * d);
                }
            }
            if (o.type == WidgetLayout.TEXT) assertTrue(o.x >= 0 && o.x <= w && o.y > 0 && o.y <= h);
        }
        assertTrue(badge);
    }

    @Test
    public void fullTransparencyDrawsNoPanels() {
        WidgetLayout.Op header = layout(370, 456, 1f).get(0);
        assertEquals(0, header.fill >>> 24);
        assertEquals(0, header.stroke >>> 24);
    }
}
