package app.streakcalendar;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public final class TimerState {
    public static final class Timer {
        public final String habitId;
        public final String kind;
        public final long startedAt;
        public final long endsAt;

        Timer(String habitId, String kind, long startedAt, long endsAt) {
            this.habitId = habitId;
            this.kind = kind;
            this.startedAt = startedAt;
            this.endsAt = endsAt;
        }

        JSONObject toJson() {
            JSONObject o = new JSONObject();
            try {
                o.put("habitId", habitId).put("kind", kind).put("startedAt", startedAt).put("endsAt", endsAt);
            } catch (JSONException ignored) {
            }
            return o;
        }

        static Timer from(JSONObject o) {
            if (o == null || o.optString("habitId", "").isEmpty()) return null;
            return new Timer(o.optString("habitId"), "delay".equals(o.optString("kind")) ? "delay" : "start", o.optLong("startedAt"), o.optLong("endsAt"));
        }
    }

    Timer running;
    final List<Timer> finished = new ArrayList<>();

    public static TimerState parse(String json) {
        TimerState s = new TimerState();
        if (json == null) return s;
        try {
            JSONObject o = new JSONObject(json);
            s.running = Timer.from(o.optJSONObject("current"));
            JSONArray f = o.optJSONArray("finished");
            if (f != null) for (int i = 0; i < f.length(); i++) {
                Timer t = Timer.from(f.optJSONObject(i));
                if (t != null) s.finished.add(t);
            }
        } catch (JSONException e) {
            return new TimerState();
        }
        return s;
    }

    public String toJson() {
        JSONObject o = new JSONObject();
        JSONArray f = new JSONArray();
        for (Timer t : finished) f.put(t.toJson());
        try {
            o.put("current", running == null ? JSONObject.NULL : running.toJson()).put("finished", f);
        } catch (JSONException ignored) {
        }
        return o.toString();
    }

    public void finishDue(long now) {
        if (running != null && now >= running.endsAt) {
            finished.add(running);
            running = null;
        }
    }

    public Timer current(long now) {
        finishDue(now);
        return running;
    }

    public Timer start(String habitId, String kind, int minutes, long now) {
        finishDue(now);
        if (running != null) throw new IllegalStateException("busy");
        running = new Timer(habitId, kind, now, now + minutes * 60000L);
        return running;
    }

    public void cancel(long now) {
        finishDue(now);
        running = null;
    }

    public JSONArray drain(long now) {
        finishDue(now);
        JSONArray out = new JSONArray();
        for (Timer t : finished) out.put(t.toJson());
        finished.clear();
        return out;
    }
}
