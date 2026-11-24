package app.streakcalendar;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.json.JSONArray;
import org.junit.Test;

public class TimerStateTest {
    @Test
    public void startsOneTimerAndRefusesASecond() {
        TimerState s = TimerState.parse(null);
        TimerState.Timer t = s.start("h1", "start", 5, 1000);
        assertEquals(1000 + 5 * 60000, t.endsAt);
        assertEquals("h1", s.current(1000).habitId);
        try {
            s.start("r1", "delay", 20, 2000);
            fail("expected busy");
        } catch (IllegalStateException e) {
            assertEquals("busy", e.getMessage());
        }
    }

    @Test
    public void cancelCountsNothing() {
        TimerState s = TimerState.parse(null);
        s.start("h1", "start", 5, 0);
        s.cancel();
        assertEquals(0, s.drain(10 * 60000).length());
        assertNull(s.current(10 * 60000));
    }

    @Test
    public void endedTimerIsDrainedOnceAndSurvivesARoundTrip() {
        TimerState s = TimerState.parse(null);
        s.start("h1", "start", 5, 0);
        assertEquals(0, s.drain(299999).length());
        TimerState again = TimerState.parse(s.toJson());
        assertNull(again.current(300000));
        JSONArray out = again.drain(300000);
        assertEquals(1, out.length());
        assertEquals("h1", out.optJSONObject(0).optString("habitId"));
        assertEquals(0L, out.optJSONObject(0).optLong("startedAt"));
        assertEquals(0, again.drain(300000).length());
    }

    @Test
    public void finishedTimersOverlayLikeTheApp() {
        TimerState s = TimerState.parse(null);
        s.start("h1", "start", 5, 0);
        s.finishDue(300000);
        assertEquals(1, s.finished.size());
        assertNotNull(s.finished.get(0));
        assertTrue(s.current(300000) == null);
    }

    @Test
    public void badJsonGivesAnEmptyState() {
        TimerState s = TimerState.parse("{nope");
        assertNull(s.current(0));
        assertEquals(0, s.finished.size());
    }
}
