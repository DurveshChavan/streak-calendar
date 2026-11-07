import app.streakcalendar.WidgetData;
import app.streakcalendar.WidgetLayout;
import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Calendar;
import java.util.List;

/**
 * Dev tool: runs the widget's real layout code on the JVM and writes the drawing list as JSON for render.cjs.
 * Usage: java PreviewTool <out-dir> <name> <widthDp> <heightDp> <density> <light|dark> <transparency 0-100> <habitIndex> [data.json]
 */
public class PreviewTool {
    public static void main(String[] a) throws Exception {
        float wDp = Float.parseFloat(a[2]), hDp = Float.parseFloat(a[3]), d = Float.parseFloat(a[4]);
        String json = a.length > 8 ? new String(Files.readAllBytes(Paths.get(a[8])), "UTF-8") : null;
        WidgetData data = WidgetData.parse(json);
        Calendar now = Calendar.getInstance();
        if (json != null && new JSONObject(json).has("today")) {
            String[] t = new JSONObject(json).getString("today").split("-");
            now.set(Integer.parseInt(t[0]), Integer.parseInt(t[1]) - 1, Integer.parseInt(t[2]), 12, 0, 0);
        }
        int w = Math.round(wDp * d), h = Math.round(hDp * d);
        List<WidgetLayout.Op> ops = WidgetLayout.build(data, Integer.parseInt(a[7]), new WidgetLayout.Style("dark".equals(a[5]), Integer.parseInt(a[6]) / 100f), w, h, d, now);
        JSONArray arr = new JSONArray();
        for (WidgetLayout.Op o : ops) {
            JSONObject j = new JSONObject().put("type", o.type);
            if (o.type == WidgetLayout.RECT) j.put("l", o.l).put("t", o.t).put("r", o.r).put("b", o.b).put("radius", o.radius).put("fill", o.fill).put("stroke", o.stroke).put("strokeWidth", o.strokeWidth).put("gradTop", o.gradTop).put("gradH", o.gradH);
            else if (o.type == WidgetLayout.TEXT) j.put("text", o.text).put("font", o.font).put("x", o.x).put("y", o.y).put("size", o.size).put("color", o.color).put("align", o.align).put("letterSpacing", o.letterSpacing).put("maxWidth", o.maxWidth).put("shadowRadius", o.shadowRadius).put("shadowColor", o.shadowColor);
            else if (o.type == WidgetLayout.LINE) { JSONArray p = new JSONArray(); for (float f : o.pts) p.put(f); j.put("pts", p).put("strokeWidth", o.strokeWidth).put("color", o.color); }
            else j.put("x", o.x).put("y", o.y).put("radius", o.radius).put("fill", o.fill);
            arr.put(j);
        }
        Files.write(Paths.get(a[0], a[1] + ".json"), new JSONObject().put("w", w).put("h", h).put("density", d).put("ops", arr).toString().getBytes("UTF-8"));
    }
}
