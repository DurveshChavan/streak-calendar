package app.streakcalendar;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;

import java.util.Calendar;

/**
 * Draws the widget as one fully transparent bitmap: only the translucent "tint glass" panels and the calendar itself
 * are painted, so the wallpaper shows through everywhere else. (Widgets cannot blur the wallpaper behind them;
 * the glass separation comes from a light tint, a soft top highlight and a hairline border.)
 * Layout mirrors the app: header card (month + habit-1 streak badge) above a card holding the calendar,
 * with weekdays down the left and weeks as columns.
 */
public final class WidgetRenderer {
    private WidgetRenderer() {}

    public static Bitmap render(WidgetData data, int w, int h, float density) {
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888); // starts fully transparent
        Canvas cv = new Canvas(bmp);
        final float dp = density;
        final boolean dark = data.dark;

        // palette (from the design tokens)
        final int ink = dark ? 0xFFF4F6FA : 0xFF14161A;
        final int red = dark ? 0xFFFF6B5E : 0xFFB00000;
        final int yellow = dark ? 0xFFF9B318 : 0xFFFFD700;
        final int tick = dark ? 0xFF13994C : 0xFF0E8A43;
        final int cross = dark ? 0xFFE5322A : 0xFFE10600;
        final int glassFill = dark ? 0x59000000 : 0x4DFFFFFF;          // ~35% black / ~30% white tint
        final int cellFill = dark ? 0x14FFFFFF : 0x38FFFFFF;
        final int line = dark ? 0x29F4F6FA : 0x2914161A;
        final int highlight = dark ? 0x1FFFFFFF : 0x66FFFFFF;

        Calendar now = Calendar.getInstance();
        String today = WidgetData.keyOf(now);
        int year = now.get(Calendar.YEAR), month = now.get(Calendar.MONTH);

        float gap = 6 * dp;
        float headerH = Math.max(52 * dp, Math.min(64 * dp, h * 0.16f));
        RectF header = new RectF(0, 0, w, headerH);
        RectF body = new RectF(0, headerH + gap, w, h);

        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);

        glassPanel(cv, header, 20 * dp, glassFill, highlight, line, dp);
        glassPanel(cv, body, 22 * dp, glassFill, highlight, line, dp);

        // --- header: month + year (left), streak badge (right) ---
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setColor(ink);
        t.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        t.setTextSize(Math.min(24 * dp, headerH * 0.40f));
        float padX = 16 * dp;
        cv.drawText(WidgetData.MONTHS[month], padX, headerH * 0.50f, t);
        t.setTextSize(Math.min(12 * dp, headerH * 0.2f));
        cv.drawText(String.valueOf(year), padX, headerH * 0.50f + 15 * dp, t);

        int streak = data.currentStreak(today);
        float bh = headerH - 14 * dp, bw = Math.max(110 * dp, bh * 2.5f);
        RectF badge = new RectF(w - 7 * dp - bw, (headerH - bh) / 2f, w - 7 * dp, (headerH + bh) / 2f);
        p.setStyle(Paint.Style.FILL);
        p.setColor(yellow);
        cv.drawRoundRect(badge, 15 * dp, 15 * dp, p);
        Paint bt = new Paint(Paint.ANTI_ALIAS_FLAG);
        bt.setColor(0xFF14161A);
        bt.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        bt.setTextSize(Math.min(28 * dp, bh * 0.62f));
        bt.setTextAlign(Paint.Align.RIGHT);
        float numRight = badge.left + 12 * dp + Math.max(bt.measureText("00"), bt.measureText(String.valueOf(streak)));
        cv.drawText(String.valueOf(streak), numRight, badge.centerY() + bt.getTextSize() * 0.30f, bt);
        Paint lt = new Paint(Paint.ANTI_ALIAS_FLAG);
        lt.setColor(0xFF14161A);
        lt.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        lt.setTextSize(Math.min(11 * dp, bh * 0.23f));
        lt.setLetterSpacing(0.06f);
        float lx = numRight + 9 * dp, maxLabel = badge.right - 10 * dp - lx;
        String nm = ellipsize(lt, data.name.toUpperCase(), maxLabel);
        cv.drawText(nm, lx, badge.centerY() - 1 * dp, lt);
        cv.drawText("STREAK", lx, badge.centerY() + lt.getTextSize() + 1 * dp, lt);
        // progress toward the next milestone, like the app's bar
        float barL = badge.left + 12 * dp, barR = badge.right - 12 * dp, barY = badge.bottom - 7 * dp;
        p.setColor(0x2E14161A);
        cv.drawRoundRect(new RectF(barL, barY, barR, barY + 3 * dp), 2 * dp, 2 * dp, p);
        float frac = Math.min(1f, streak / (float) WidgetData.nextMilestone(streak));
        p.setColor(0xFF14161A);
        if (frac > 0) cv.drawRoundRect(new RectF(barL, barY, barL + (barR - barL) * frac, barY + 3 * dp), 2 * dp, 2 * dp, p);

        // --- calendar: weekdays down the left, weeks as columns ---
        float pad = 10 * dp, cg = 4 * dp, labelW = 16 * dp;
        float gx = body.left + pad + labelW + cg, gy = body.top + pad;
        float availW = body.right - pad - gx, availH = body.bottom - pad - gy;
        float cell = Math.min((availW - 5 * cg) / 6f, (availH - 6 * cg) / 7f);
        if (cell < 6 * dp) return bmp; // too small to draw legibly
        float gridW = cell * 6 + cg * 5, gridH = cell * 7 + cg * 6;
        float ox = gx + (availW - gridW) / 2f, oy = gy + (availH - gridH) / 2f;

        String[][][] grid = WidgetData.monthGrid(year, month);
        String[] wd = {"S", "M", "T", "W", "T", "F", "S"};
        Paint lab = new Paint(Paint.ANTI_ALIAS_FLAG);
        lab.setTextAlign(Paint.Align.CENTER);
        lab.setTextSize(Math.min(14 * dp, cell * 0.42f));
        for (int r = 0; r < 7; r++) {
            lab.setColor(r == 0 ? red : ink);
            lab.setTypeface(Typeface.create("sans-serif-medium", r == 0 ? Typeface.BOLD : Typeface.NORMAL));
            cv.drawText(wd[r], ox - cg - labelW / 2f, oy + r * (cell + cg) + cell / 2f + lab.getTextSize() * 0.35f, lab);
        }

        Paint num = new Paint(Paint.ANTI_ALIAS_FLAG);
        num.setTextAlign(Paint.Align.CENTER);
        float radius = Math.min(12 * dp, cell * 0.28f);
        for (int c = 0; c < 6; c++) {
            for (int r = 0; r < 7; r++) {
                String[] g = grid[c][r];
                boolean inMonth = "1".equals(g[2]), isToday = g[0].equals(today);
                String mark = data.marks.get(g[0]);
                RectF rc = new RectF(ox + c * (cell + cg), oy + r * (cell + cg), ox + c * (cell + cg) + cell, oy + r * (cell + cg) + cell);
                int alpha = inMonth ? 255 : 97; // out-of-month days fade like the app (.38)
                int fill = "t".equals(mark) ? tick : "x".equals(mark) ? cross : isToday ? yellow : cellFill;
                p.setStyle(Paint.Style.FILL);
                p.setColor(fill);
                p.setAlpha(Math.min(alpha, android.graphics.Color.alpha(fill)));
                cv.drawRoundRect(rc, radius, radius, p);
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(isToday ? 2 * dp : 1 * dp);
                p.setColor(isToday ? yellow : line);
                p.setAlpha(Math.min(alpha, android.graphics.Color.alpha(isToday ? yellow : line)));
                cv.drawRoundRect(rc, radius, radius, p);

                boolean sunday = r == 0;
                num.setTypeface(Typeface.create("sans-serif", (sunday || isToday) ? Typeface.BOLD : Typeface.NORMAL));
                if (mark != null) {
                    // date shrinks to the corner, tick/cross in the middle (as on the app's cube faces)
                    num.setColor(0xFFFFFFFF);
                    num.setAlpha(alpha);
                    num.setTextSize(Math.max(7 * dp, cell * 0.22f));
                    cv.drawText(g[1], rc.left + cell * 0.27f, rc.top + cell * 0.33f, num);
                    drawGlyph(cv, rc, "t".equals(mark), alpha, dp);
                } else {
                    num.setColor(isToday ? (sunday ? 0xFFB00000 : 0xFF14161A) : sunday ? red : ink);
                    num.setAlpha(alpha);
                    num.setTextSize(Math.max(9 * dp, Math.min(22 * dp, cell * 0.36f)));
                    cv.drawText(g[1], rc.centerX(), rc.centerY() + num.getTextSize() * 0.35f, num);
                }
            }
        }
        return bmp;
    }

    private static void glassPanel(Canvas cv, RectF r, float radius, int fill, int highlight, int line, float dp) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.FILL);
        p.setColor(fill);
        cv.drawRoundRect(r, radius, radius, p);
        // soft light catching the top edge
        p.setShader(new LinearGradient(0, r.top, 0, r.top + Math.min(r.height(), 80 * dp), highlight, 0x00FFFFFF, Shader.TileMode.CLAMP));
        cv.drawRoundRect(r, radius, radius, p);
        p.setShader(null);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(1 * dp);
        p.setColor(line);
        RectF in = new RectF(r.left + 0.5f * dp, r.top + 0.5f * dp, r.right - 0.5f * dp, r.bottom - 0.5f * dp);
        cv.drawRoundRect(in, radius, radius, p);
    }

    private static void drawGlyph(Canvas cv, RectF rc, boolean tickGlyph, int alpha, float dp) {
        Paint g = new Paint(Paint.ANTI_ALIAS_FLAG);
        g.setStyle(Paint.Style.STROKE);
        g.setStrokeCap(Paint.Cap.ROUND);
        g.setStrokeJoin(Paint.Join.ROUND);
        g.setColor(0xFFFFFFFF);
        g.setAlpha(alpha);
        float s = rc.width(), cx = rc.centerX(), cy = rc.centerY() + s * 0.06f;
        g.setStrokeWidth(Math.max(1.6f * dp, s * 0.09f));
        Path path = new Path();
        if (tickGlyph) {
            float k = s * 0.23f;
            path.moveTo(cx - k, cy);
            path.lineTo(cx - k * 0.3f, cy + k * 0.75f);
            path.lineTo(cx + k, cy - k * 0.75f);
        } else {
            float k = s * 0.17f;
            path.moveTo(cx - k, cy - k);
            path.lineTo(cx + k, cy + k);
            path.moveTo(cx + k, cy - k);
            path.lineTo(cx - k, cy + k);
        }
        cv.drawPath(path, g);
    }

    private static String ellipsize(Paint p, String s, float max) {
        if (max <= 0) return "";
        if (p.measureText(s) <= max) return s;
        while (s.length() > 1 && p.measureText(s + "…") > max) s = s.substring(0, s.length() - 1);
        return s + "…";
    }
}
