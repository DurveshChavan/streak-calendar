package app.streakcalendar;

import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Web layer -> native: widget data (all habits, theme, holidays) and the app theme for the system bars. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    static final String APP_DARK = "appDark";

    @PluginMethod
    public void update(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }
        Context ctx = getContext();
        WidgetPrefs.sp(ctx).edit().putString(WidgetPrefs.DATA, json).apply();
        StreakWidgetProvider.refreshAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void setTheme(PluginCall call) {
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        WidgetPrefs.sp(getContext()).edit().putBoolean(APP_DARK, dark).apply();
        getActivity().runOnUiThread(() -> MainActivity.applySystemBars(getActivity(), dark));
        call.resolve();
    }
}
