package app.streakcalendar;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private int lastKb = -1;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class); // must run before super.onCreate
        super.onCreate(savedInstanceState);
        // Edge to edge on every Android version, with the insets handled here: the system bars become margins
        // around the page, and the keyboard height is handed to the page (CSS --kb) so sheets rise above the
        // keyboard. On Android 15+ the window is no longer resized for the keyboard, which hid the inputs.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        applySystemBars(this, WidgetPrefs.sp(this).getBoolean(WidgetBridgePlugin.APP_DARK, false));
        if (getBridge() == null || getBridge().getWebView() == null) return;
        final WebView web = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(web, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            ViewGroup.MarginLayoutParams mlp = (ViewGroup.MarginLayoutParams) v.getLayoutParams();
            if (mlp.leftMargin != bars.left || mlp.topMargin != bars.top || mlp.rightMargin != bars.right || mlp.bottomMargin != bars.bottom) {
                mlp.setMargins(bars.left, bars.top, bars.right, bars.bottom);
                v.setLayoutParams(mlp);
            }
            int kb = Math.round(Math.max(0, ime.bottom - bars.bottom) / getResources().getDisplayMetrics().density);
            if (kb != lastKb) {
                lastKb = kb;
                web.evaluateJavascript("window.dispatchEvent(new CustomEvent('nativekeyboard',{detail:{height:" + kb + "}}))", null);
            }
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(web);
    }

    /** Transparent bars over the app's own background colour, with light or dark icons to match the theme. */
    static void applySystemBars(Activity a, boolean dark) {
        Window w = a.getWindow();
        w.getDecorView().setBackgroundColor(dark ? 0xFF030303 : 0xFFB7D8F5);
        if (Build.VERSION.SDK_INT < 35) {
            w.setStatusBarColor(Color.TRANSPARENT);
            w.setNavigationBarColor(Color.TRANSPARENT);
        }
        if (Build.VERSION.SDK_INT >= 29) w.setNavigationBarContrastEnforced(false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
        c.setAppearanceLightStatusBars(!dark);
        c.setAppearanceLightNavigationBars(!dark);
    }
}
