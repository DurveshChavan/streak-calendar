package app.streakcalendar;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

/**
 * Widget settings (long-press the widget > Settings): transparency 0-100 %, theme (match app / light / dark)
 * and which habit it shows, with a live preview drawn over the real wallpaper.
 */
public class WidgetSettingsActivity extends Activity {
    private static final String[] THEMES = {WidgetPrefs.THEME_APP, WidgetPrefs.THEME_LIGHT, WidgetPrefs.THEME_DARK};

    private int id = AppWidgetManager.INVALID_APPWIDGET_ID;
    private WidgetData data;
    private WidgetPrefs prefs;
    private float[] px;
    private Bitmap bmp;
    private ImageView preview;
    private TextView value;
    private Button[] themes;
    private LinearLayout habitList;
    private int ink, line, cell, yellow;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Bundle ex = getIntent() == null ? null : getIntent().getExtras();
        if (ex != null) id = ex.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }
        // backing out keeps the widget with its current settings, rather than removing it
        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id));
        setContentView(R.layout.activity_widget_settings);

        data = WidgetData.parse(WidgetPrefs.data(this));
        prefs = WidgetPrefs.load(this, id);
        px = StreakWidgetProvider.renderSize(this, StreakWidgetProvider.sizeDp(this, AppWidgetManager.getInstance(this), id));
        bmp = Bitmap.createBitmap((int) px[0], (int) px[1], Bitmap.Config.ARGB_8888);

        boolean dark = data.dark; // the sheet itself follows the app's theme
        ink = dark ? 0xFFF4F6FA : 0xFF14161A;
        line = dark ? 0x29F4F6FA : 0x2914161A;
        cell = dark ? 0x12FFFFFF : 0x6BFFFFFF;
        yellow = dark ? 0xFFF9B318 : 0xFFFFD700;

        View sheet = findViewById(R.id.sheet);
        float r = dp(26);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadii(new float[]{r, r, r, r, 0, 0, 0, 0});
        bg.setColor(dark ? 0xF00B0C0E : 0xF0CFE3F6);
        bg.setStroke(Math.max(1, Math.round(dp(1))), line);
        sheet.setBackground(bg);
        findViewById(R.id.handle).setBackground(round(line, 0, dp(2)));
        for (int tv : new int[]{R.id.title, R.id.transparency_label, R.id.transparency_value, R.id.theme_label, R.id.habit_label}) {
            ((TextView) findViewById(tv)).setTextColor(ink);
        }

        preview = findViewById(R.id.preview);
        preview.setImageBitmap(bmp);
        value = findViewById(R.id.transparency_value);
        SeekBar bar = findViewById(R.id.transparency);
        bar.setProgressTintList(ColorStateList.valueOf(yellow));
        bar.setThumbTintList(ColorStateList.valueOf(ink));
        bar.setProgressBackgroundTintList(ColorStateList.valueOf(dark ? 0x66F4F6FA : 0x6614161A));
        bar.setProgress(prefs.transparency);
        bar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar s, int v, boolean fromUser) {
                prefs.transparency = v;
                redraw();
            }

            @Override
            public void onStartTrackingTouch(SeekBar s) {
            }

            @Override
            public void onStopTrackingTouch(SeekBar s) {
            }
        });

        themes = new Button[]{findViewById(R.id.theme_app), findViewById(R.id.theme_light), findViewById(R.id.theme_dark)};
        for (int i = 0; i < THEMES.length; i++) {
            final String k = THEMES[i];
            themes[i].setOnClickListener(v -> {
                prefs.theme = k;
                redraw();
            });
        }

        habitList = findViewById(R.id.habit_list);
        boolean many = data.habits.size() > 1;
        findViewById(R.id.habit_label).setVisibility(many ? View.VISIBLE : View.GONE);
        findViewById(R.id.habit_scroll).setVisibility(many ? View.VISIBLE : View.GONE);
        if (many) {
            for (WidgetData.Habit h : data.habits) {
                Button b = new Button(this);
                b.setText(h.name);
                b.setSingleLine(true);
                b.setTag(h.id);
                b.setOnClickListener(v -> {
                    prefs.habitId = (String) v.getTag();
                    redraw();
                });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, Math.round(dp(40)));
                lp.setMarginEnd(Math.round(dp(8)));
                habitList.addView(b, lp);
            }
        }

        Button cancel = findViewById(R.id.cancel), save = findViewById(R.id.save);
        style(cancel, false);
        style(save, true);
        cancel.setOnClickListener(v -> finish());
        save.setOnClickListener(v -> {
            prefs.save(this, id);
            StreakWidgetProvider.update(this, AppWidgetManager.getInstance(this), id);
            finish();
        });

        applyInsets(findViewById(R.id.root), sheet);
        redraw();
    }

    private void redraw() {
        value.setText(prefs.transparency + "%");
        for (int i = 0; i < themes.length; i++) {
            boolean on = THEMES[i].equals(prefs.theme);
            style(themes[i], on);
            themes[i].setSelected(on);
        }
        int hi = data.indexOf(prefs.habitId);
        for (int i = 0; i < habitList.getChildCount(); i++) {
            Button b = (Button) habitList.getChildAt(i);
            style(b, i == hi);
            b.setSelected(i == hi);
        }
        WidgetRenderer.renderInto(bmp, StreakWidgetProvider.layout(data, prefs, px));
        preview.invalidate();
    }

    /** Selected = yellow (the app's accent), otherwise a glass cell with a hairline border. */
    private void style(Button b, boolean on) {
        b.setAllCaps(false);
        b.setStateListAnimator(null);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setPadding(Math.round(dp(16)), 0, Math.round(dp(16)), 0);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        b.setTextColor(on ? 0xFF14161A : ink);
        b.setTypeface(Typeface.create("sans-serif", on ? Typeface.BOLD : Typeface.NORMAL));
        b.setBackground(round(on ? yellow : cell, on ? 0 : line, dp(14)));
    }

    private GradientDrawable round(int fill, int stroke, float radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(fill);
        g.setCornerRadius(radius);
        if (stroke != 0) g.setStroke(Math.max(1, Math.round(dp(1))), stroke);
        return g;
    }

    private float dp(float v) {
        return v * getResources().getDisplayMetrics().density;
    }

    /** Edge to edge: keep content clear of the bars; the sheet runs down behind the navigation bar. */
    private void applyInsets(View root, View sheet) {
        final int sheetBottom = sheet.getPaddingBottom();
        root.setOnApplyWindowInsetsListener((v, ins) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = ins.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                l = i.left;
                t = i.top;
                r = i.right;
                b = i.bottom;
            } else {
                l = ins.getSystemWindowInsetLeft();
                t = ins.getSystemWindowInsetTop();
                r = ins.getSystemWindowInsetRight();
                b = ins.getSystemWindowInsetBottom();
            }
            v.setPadding(l, t, r, 0);
            sheet.setPadding(sheet.getPaddingLeft(), sheet.getPaddingTop(), sheet.getPaddingRight(), sheetBottom + b);
            return ins;
        });
        root.requestApplyInsets();
    }
}
