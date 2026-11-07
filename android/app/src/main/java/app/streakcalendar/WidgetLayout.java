package app.streakcalendar;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * Lays the widget out as a flat list of drawing operations, in pixels. Pure Java (no Android types), so it runs
 * on a plain JVM: WidgetRenderer replays the list on an Android Canvas, and the same list renders the
 * widget-picker preview images, so the picker shows exactly what the widget draws.
 *
 * Layout mirrors the app: a header (month + streak badge), the month calendar (weekdays down the left,
 * weeks as columns) and, when the widget is tall enough (4x6 / full page), the "This month" and
 * "Next holidays" cards. Everything outside the drawn panels stays fully transparent.
 */
public final class WidgetLayout {
    public static final int RECT = 0, TEXT = 1, LINE = 2, CIRCLE = 3;
    public static final int LEFT = 0, CENTER = 1, RIGHT = 2;
    /** Header height and badge tap-area width; must match res/layout/widget_streak.xml. */
    public static final float HEADER_DP = 64, BADGE_HIT_DP = 150;

    public static final class Op {
        public int type;
        /** RECT bounds / radius; fill and stroke are ARGB (0 = none); gradTop fades to transparent over gradH. */
        public float l, t, r, b, radius, strokeWidth, gradH;
        public int fill, stroke, gradTop;
        /** TEXT at baseline (x, y); font is light|regular|medium|bold; letterSpacing in em; maxWidth 0 = no ellipsis. */
        public String text, font;
        public float x, y, size, letterSpacing, maxWidth, shadowRadius;
        public int color, align, shadowColor;
        /** LINE: polyline points x0,y0,x1,y1,... drawn with round caps/joins. CIRCLE: x, y, radius, fill. */
        public float[] pts;
    }

    public static final class Style {
        public final boolean dark;
        /** 0 = solid glass panels, 1 = no panels at all (only the calendar and text). */
        public final float transparency;

        public Style(boolean dark, float transparency) {
            this.dark = dark;
            this.transparency = Math.max(0f, Math.min(1f, transparency));
        }
    }

    private final List<Op> ops = new ArrayList<>();
    private final float d;
    private float shadowR;
    private int shadowInk, shadowWhite;

    private WidgetLayout(float density) {
        d = density;
    }

    private float dp(float v) {
        return v * d;
    }

    static int argb(int rgb, float a) {
        int al = Math.round(Math.max(0f, Math.min(1f, a)) * 255f);
        return (al << 24) | (rgb & 0xFFFFFF);
    }

    public static List<Op> build(WidgetData data, int habitIndex, Style st, int w, int h, float density, Calendar now) {
        WidgetLayout L = new WidgetLayout(density);
        L.layout(data, Math.max(0, Math.min(habitIndex, data.habits.size() - 1)), st, w, h, now);
        return L.ops;
    }

    private void layout(WidgetData data, int hi, Style st, int w, int h, Calendar now) {
        final boolean dark = st.dark;
        final float t = st.transparency;
        // palette (the app's design tokens)
        final int ink = dark ? 0xF4F6FA : 0x14161A, red = dark ? 0xFF6B5E : 0xB00000, yellow = dark ? 0xF9B318 : 0xFFD700;
        final int tick = dark ? 0x13994C : 0x0E8A43, cross = dark ? 0xE5322A : 0xE10600;
        // the transparency dial: panels fade out; the default (70%) matches the original look
        final float glassK = Math.min(1f, (1f - t) / 0.3f);
        final int panel = argb(dark ? 0x000000 : 0xFFFFFF, 1f - t);
        final int hilite = argb(0xFFFFFF, (dark ? .12f : .40f) * glassK);
        final int border = argb(ink, .16f * glassK);
        final int cellFill = argb(0xFFFFFF, dark ? .08f : .22f), cellLine = argb(ink, .16f);
        // over a bare wallpaper, text gets a soft halo so it stays readable
        final float shadowK = Math.max(0f, (t - .55f) / .45f);
        shadowR = shadowK > 0 ? dp(4) : 0;
        shadowInk = argb(dark ? 0x000000 : 0xFFFFFF, (dark ? .8f : .9f) * shadowK);
        shadowWhite = argb(0x000000, .7f * shadowK);

        final String today = WidgetData.keyOf(now);
        final int year = now.get(Calendar.YEAR), month = now.get(Calendar.MONTH);
        final WidgetData.Habit hab = data.habits.get(hi);
        final int n = data.habits.size();

        // ---------- header: month (left), streak badge (right) ----------
        final float hh = dp(HEADER_DP), gap = dp(6);
        glass(0, 0, w, hh, dp(20), panel, hilite, border);

        final int streak = WidgetData.currentStreak(hab.marks, today);
        final float bh = dp(50), bw = dp(n > 1 ? 142 : 132);
        final float br = w - dp(7), bl = br - bw, bt = (hh - bh) / 2f, bb = bt + bh, bc = bt + bh / 2f;
        rect(bl, bt, br, bb, dp(15), argb(yellow, 1));
        final float ns = dp(28);
        final String num = String.valueOf(streak);
        final float slot = Math.max(2, num.length()) * .58f * ns;
        text(num, bl + dp(12) + slot, bc + ns * .30f, ns, "bold", RIGHT, argb(0x14161A, 1), 0, 0, false, false);
        final float lx = bl + dp(12) + slot + dp(9), lw = br - dp(n > 1 ? 22 : 12) - lx;
        text(hab.name.toUpperCase(), lx, bc - dp(1), dp(11), "medium", LEFT, argb(0x14161A, 1), .06f, lw, false, false);
        text("STREAK", lx, bc + dp(12), dp(11), "medium", LEFT, argb(0x14161A, 1), .06f, lw, false, false);
        final float pl = bl + dp(12), pr = br - dp(n > 1 ? 26 : 14), py = bb - dp(8);
        rect(pl, py, pr, py + dp(3), dp(1.5f), argb(0x14161A, .18f));
        final float frac = Math.min(1f, streak / (float) WidgetData.nextMilestone(streak));
        if (frac > 0) rect(pl, py, pl + (pr - pl) * frac, py + dp(3), dp(1.5f), argb(0x14161A, 1));
        if (n > 1) { // which habit this is, like the app's badge (tap the badge to switch)
            final int W = 5, a0 = n <= W ? 0 : Math.min(Math.max(0, hi - 2), n - W), a1 = Math.min(n, a0 + W);
            float total = 0;
            float[] sz = new float[a1 - a0];
            for (int i = a0; i < a1; i++) {
                boolean edge = n > W && ((i == a0 && a0 > 0) || (i == a1 - 1 && a1 < n));
                sz[i - a0] = dp(i == hi ? 6 : edge ? 3 : 5);
                total += sz[i - a0] + (i > a0 ? dp(3) : 0);
            }
            float y = bc - dp(2) - total / 2f;
            for (int i = a0; i < a1; i++) {
                float s = sz[i - a0];
                circle(br - dp(10), y + s / 2f, s / 2f, i == hi ? argb(0x14161A, 1) : argb(0x14161A, .32f));
                y += s + dp(3);
            }
        }

        final float tx = dp(16), titleMax = bl - dp(10) - tx;
        final float ts = Math.max(dp(15), Math.min(dp(24), titleMax / 4.7f));
        text(WidgetData.MONTHS[month], tx, hh * .5f, ts, "light", LEFT, argb(ink, 1), -.02f, titleMax, true, false);
        text(String.valueOf(year), tx, hh * .5f + dp(15), dp(12), "light", LEFT, argb(ink, 1), 0, titleMax, true, false);

        // ---------- calendar ----------
        final float top = hh + gap, pad = dp(10), cg = dp(4), labelW = dp(16);
        final float availW = w - 2 * pad - labelW - cg;
        final float cW = (availW - 5 * cg) / 6f;
        final float calNatural = 7 * cW + 6 * cg + 2 * pad;
        final float cardsMin = dp(124);
        final boolean cards = (h - top) - calNatural >= cardsMin + gap; // tall (4x6 / full page): add the app's cards
        final float bodyBottom = cards ? top + calNatural : h;
        glass(0, top, w, bodyBottom, dp(22), panel, hilite, border);

        final float availH = bodyBottom - top - 2 * pad;
        final float c = Math.min(cW, (availH - 6 * cg) / 7f);
        if (c >= dp(8)) {
            final float gridW = 6 * c + 5 * cg, gridH = 7 * c + 6 * cg;
            final float ox = pad + labelW + cg + (availW - gridW) / 2f, oy = top + pad + (availH - gridH) / 2f;
            final String[] wd = {"S", "M", "T", "W", "T", "F", "S"};
            final float ls = Math.min(dp(14), c * .42f);
            for (int r = 0; r < 7; r++) {
                text(wd[r], ox - cg - labelW / 2f, oy + r * (c + cg) + c / 2f + ls * .35f, ls, r == 0 ? "bold" : "medium", CENTER,
                        argb(r == 0 ? red : ink, 1), 0, 0, true, false);
            }
            final String[][][] grid = WidgetData.monthGrid(year, month);
            final float radius = Math.min(dp(12), c * .28f);
            for (int col = 0; col < 6; col++) {
                for (int r = 0; r < 7; r++) {
                    final String[] g = grid[col][r];
                    final boolean inMonth = "1".equals(g[2]), isToday = g[0].equals(today), redDay = r == 0 || data.holidays.containsKey(g[0]);
                    final String mark = hab.marks.get(g[0]);
                    final float a = inMonth ? 1f : .38f; // out-of-month days fade, as in the app
                    final float l = ox + col * (c + cg), tp = oy + r * (c + cg);
                    final int fill = "t".equals(mark) ? argb(tick, a) : "x".equals(mark) ? argb(cross, a) : isToday ? argb(yellow, a)
                            : argb(0xFFFFFF, (cellFill >>> 24) / 255f * a);
                    Op cell = rect(l, tp, l + c, tp + c, radius, fill);
                    cell.stroke = isToday ? argb(yellow, a) : argb(ink, (cellLine >>> 24) / 255f * a);
                    cell.strokeWidth = isToday ? dp(2) : dp(1);
                    if (mark != null) {
                        // the date shrinks to the corner and the tick / cross takes the middle, like the app's cube face
                        text(g[1], l + c * .27f, tp + c * .33f, Math.max(dp(7), c * .22f), isToday || redDay ? "bold" : "regular", CENTER, argb(0xFFFFFF, a), 0, 0, false, false);
                        glyph(l, tp, c, "t".equals(mark), argb(0xFFFFFF, a));
                    } else {
                        final int col2 = isToday ? argb(redDay ? 0xB00000 : 0x14161A, a) : argb(redDay ? red : ink, a);
                        final float s = Math.max(dp(9), Math.min(dp(22), c * .36f));
                        text(g[1], l + c / 2f, tp + c / 2f + s * .35f, s, isToday || redDay ? "bold" : "regular", CENTER, col2, 0, 0, !isToday, false);
                    }
                }
            }
        }

        if (!cards) return;
        // ---------- full page: "This month" + "Next holidays" ----------
        final float ct = bodyBottom + gap, cb = h, cw = (w - dp(8)) / 2f;
        rect(0, ct, cw, cb, dp(20), argb(dark ? 0x5245F8 : 0xE10600, (dark ? .90f : .88f) * glassK));
        // once the coloured card has mostly faded away, its text switches to the normal ink so it stays readable
        final boolean solidCard = glassK >= .5f;
        final int white = solidCard ? argb(0xFFFFFF, 1) : argb(ink, 1);
        final float px = dp(14);
        text("THIS MONTH", px, ct + dp(19.5f), dp(11), "medium", LEFT, white, .08f, cw - 2 * px, !solidCard, solidCard);
        final int[] mc = WidgetData.monthCounts(hab.marks, year, month);
        final String[][] rows = {{"Done", String.valueOf(mc[0])}, {"Missed", String.valueOf(mc[1])}, {"Best streak", String.valueOf(WidgetData.bestStreak(hab.marks, today))}};
        float y = ct + dp(46);
        for (int i = 0; i < 3; i++) {
            if (i == 2) {
                rect(px, y - dp(16), cw - px, y - dp(15), 0, solidCard ? argb(0xFFFFFF, .4f) : argb(ink, .25f)); // divider 8dp below "Missed"
                y += dp(5);
            }
            if (y + dp(4) > cb - dp(8)) break;
            text(rows[i][0], px, y, dp(14), "light", LEFT, white, 0, cw * .62f, !solidCard, solidCard);
            text(rows[i][1], cw - px, y, dp(20), "regular", RIGHT, white, 0, 0, !solidCard, solidCard);
            y += dp(24);
        }

        final float hx = cw + dp(8);
        glass(hx, ct, w, cb, dp(20), panel, hilite, border);
        text("NEXT HOLIDAYS", hx + px, ct + dp(19.5f), dp(11), "medium", LEFT, argb(ink, 1), .08f, w - hx - 2 * px, true, false);
        final float pitch = dp(41.85f), first = ct + dp(30);
        final int fit = Math.max(0, Math.min(4, (int) ((cb - dp(11) - first + dp(8)) / pitch)));
        final List<String[]> up = data.upcoming(now, fit);
        for (int i = 0; i < up.size(); i++) {
            final float ey = first + i * pitch;
            text(up.get(i)[0], hx + px, ey + dp(12.5f), dp(13), "bold", LEFT, argb(red, 1), 0, w - hx - 2 * px, true, false);
            text(up.get(i)[1], hx + px, ey + dp(30), dp(13), "light", LEFT, argb(ink, 1), 0, w - hx - 2 * px, true, false);
        }
        if (up.isEmpty() && fit > 0) text("Open the app to load them", hx + px, first + dp(12.5f), dp(13), "light", LEFT, argb(ink, .7f), 0, w - hx - 2 * px, true, false);
    }

    // ---------- primitives ----------
    private void glass(float l, float t, float r, float b, float radius, int fill, int hilite, int border) {
        Op o = rect(l, t, r, b, radius, fill);
        o.gradTop = hilite;
        o.gradH = Math.min(b - t, dp(80));
        o.stroke = border;
        o.strokeWidth = dp(1);
    }

    private Op rect(float l, float t, float r, float b, float radius, int fill) {
        Op o = new Op();
        o.type = RECT;
        o.l = l;
        o.t = t;
        o.r = r;
        o.b = b;
        o.radius = radius;
        o.fill = fill;
        ops.add(o);
        return o;
    }

    /** haloInk: text drawn straight over glass/wallpaper; haloWhite: white text on a fading card. */
    private void text(String s, float x, float y, float size, String font, int align, int color, float letterSpacing, float maxWidth, boolean haloInk, boolean haloWhite) {
        Op o = new Op();
        o.type = TEXT;
        o.text = s;
        o.x = x;
        o.y = y;
        o.size = size;
        o.font = font;
        o.align = align;
        o.color = color;
        o.letterSpacing = letterSpacing;
        o.maxWidth = maxWidth;
        if ((haloInk || haloWhite) && shadowR > 0) {
            o.shadowRadius = shadowR;
            o.shadowColor = haloInk ? shadowInk : shadowWhite;
        }
        ops.add(o);
    }

    private void circle(float x, float y, float radius, int fill) {
        Op o = new Op();
        o.type = CIRCLE;
        o.x = x;
        o.y = y;
        o.radius = radius;
        o.fill = fill;
        ops.add(o);
    }

    private void line(float sw, int color, float... pts) {
        Op o = new Op();
        o.type = LINE;
        o.strokeWidth = sw;
        o.color = color;
        o.pts = pts;
        ops.add(o);
    }

    private void glyph(float l, float t, float s, boolean tickGlyph, int color) {
        final float cx = l + s / 2f, cy = t + s / 2f + s * .06f, sw = Math.max(dp(1.6f), s * .09f);
        if (tickGlyph) {
            final float k = s * .23f;
            line(sw, color, cx - k, cy, cx - k * .3f, cy + k * .75f, cx + k, cy - k * .75f);
        } else {
            final float k = s * .17f;
            line(sw, color, cx - k, cy - k, cx + k, cy + k);
            line(sw, color, cx + k, cy - k, cx - k, cy + k);
        }
    }
}
