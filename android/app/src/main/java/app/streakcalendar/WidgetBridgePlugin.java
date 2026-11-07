package app.streakcalendar;

import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Web layer -> widget: stores the latest habit-1 data and redraws any placed widgets. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }
        Context ctx = getContext();
        ctx.getSharedPreferences(StreakWidgetProvider.PREFS, Context.MODE_PRIVATE).edit().putString(StreakWidgetProvider.KEY, json).apply();
        StreakWidgetProvider.refreshAll(ctx);
        call.resolve();
    }
}
