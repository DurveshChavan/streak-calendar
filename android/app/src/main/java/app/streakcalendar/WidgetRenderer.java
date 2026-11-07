package app.streakcalendar;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;

import java.util.List;

/** Replays a {@link WidgetLayout} drawing list on an Android Canvas. Untouched pixels stay fully transparent. */
public final class WidgetRenderer {
    private static final Typeface LIGHT = Typeface.create("sans-serif-light", Typeface.NORMAL);
    private static final Typeface REGULAR = Typeface.create("sans-serif", Typeface.NORMAL);
    private static final Typeface MEDIUM = Typeface.create("sans-serif-medium", Typeface.NORMAL);
    private static final Typeface BOLD = Typeface.create("sans-serif", Typeface.BOLD);

    private WidgetRenderer() {}

    public static Bitmap render(List<WidgetLayout.Op> ops, int w, int h) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        draw(new Canvas(bmp), ops);
        return bmp;
    }

    /** Clears and redraws an existing bitmap (used by the settings preview, which redraws on every slider move). */
    public static void renderInto(Bitmap bmp, List<WidgetLayout.Op> ops) {
        bmp.eraseColor(0);
        draw(new Canvas(bmp), ops);
    }

    public static void draw(Canvas cv, List<WidgetLayout.Op> ops) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF rf = new RectF();
        for (WidgetLayout.Op o : ops) {
            p.reset();
            p.setAntiAlias(true);
            switch (o.type) {
                case WidgetLayout.RECT:
                    rf.set(o.l, o.t, o.r, o.b);
                    if (o.fill != 0) {
                        p.setStyle(Paint.Style.FILL);
                        p.setColor(o.fill);
                        cv.drawRoundRect(rf, o.radius, o.radius, p);
                    }
                    if (o.gradTop != 0 && o.gradH > 0) { // soft light catching the top edge
                        p.setStyle(Paint.Style.FILL);
                        p.setShader(new LinearGradient(0, o.t, 0, o.t + o.gradH, o.gradTop, o.gradTop & 0x00FFFFFF, Shader.TileMode.CLAMP));
                        cv.drawRoundRect(rf, o.radius, o.radius, p);
                        p.setShader(null);
                    }
                    if (o.stroke != 0 && o.strokeWidth > 0) {
                        float h = o.strokeWidth / 2f;
                        rf.set(o.l + h, o.t + h, o.r - h, o.b - h);
                        p.setStyle(Paint.Style.STROKE);
                        p.setStrokeWidth(o.strokeWidth);
                        p.setColor(o.stroke);
                        cv.drawRoundRect(rf, Math.max(0, o.radius - h), Math.max(0, o.radius - h), p);
                    }
                    break;
                case WidgetLayout.TEXT:
                    p.setColor(o.color);
                    p.setTextSize(o.size);
                    p.setTypeface("light".equals(o.font) ? LIGHT : "medium".equals(o.font) ? MEDIUM : "bold".equals(o.font) ? BOLD : REGULAR);
                    p.setLetterSpacing(o.letterSpacing);
                    p.setTextAlign(o.align == WidgetLayout.RIGHT ? Paint.Align.RIGHT : o.align == WidgetLayout.CENTER ? Paint.Align.CENTER : Paint.Align.LEFT);
                    if (o.shadowRadius > 0) p.setShadowLayer(o.shadowRadius, 0, o.shadowRadius * .3f, o.shadowColor);
                    cv.drawText(o.maxWidth > 0 ? ellipsize(p, o.text, o.maxWidth) : o.text, o.x, o.y, p);
                    break;
                case WidgetLayout.LINE:
                    Path path = new Path();
                    path.moveTo(o.pts[0], o.pts[1]);
                    for (int i = 2; i + 1 < o.pts.length; i += 2) path.lineTo(o.pts[i], o.pts[i + 1]);
                    p.setStyle(Paint.Style.STROKE);
                    p.setStrokeCap(Paint.Cap.ROUND);
                    p.setStrokeJoin(Paint.Join.ROUND);
                    p.setStrokeWidth(o.strokeWidth);
                    p.setColor(o.color);
                    cv.drawPath(path, p);
                    break;
                case WidgetLayout.CIRCLE:
                    p.setStyle(Paint.Style.FILL);
                    p.setColor(o.fill);
                    cv.drawCircle(o.x, o.y, o.radius, p);
                    break;
                default:
                    break;
            }
        }
    }

    private static String ellipsize(Paint p, String s, float max) {
        if (p.measureText(s) <= max) return s;
        while (s.length() > 1 && p.measureText(s + "…") > max) s = s.substring(0, s.length() - 1);
        return s.isEmpty() ? "" : s + "…";
    }
}
