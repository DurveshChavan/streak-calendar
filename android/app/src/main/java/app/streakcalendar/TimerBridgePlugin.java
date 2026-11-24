package app.streakcalendar;

import android.Manifest;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;

@CapacitorPlugin(name = "TimerBridge", permissions = {@Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})})
public class TimerBridgePlugin extends Plugin {
    private static JSObject json(TimerState.Timer t) {
        JSObject o = new JSObject();
        o.put("habitId", t.habitId);
        o.put("kind", t.kind);
        o.put("startedAt", t.startedAt);
        o.put("endsAt", t.endsAt);
        return o;
    }

    @PluginMethod
    public void current(PluginCall call) {
        TimerState.Timer t = TimerStore.current(getContext());
        JSObject r = new JSObject();
        r.put("timer", t == null ? null : json(t));
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) {
        String habit = call.getString("habitId");
        Integer minutes = call.getInt("minutes");
        if (habit == null || minutes == null || minutes < 1) {
            call.reject("habitId and minutes are required");
            return;
        }
        try {
            TimerState.Timer t = TimerStore.start(getContext(), habit, "delay".equals(call.getString("kind")) ? "delay" : "start", minutes);
            JSObject r = new JSObject();
            r.put("timer", json(t));
            call.resolve(r);
        } catch (IllegalStateException e) {
            call.reject("busy");
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        TimerStore.cancel(getContext());
        call.resolve();
    }

    @PluginMethod
    public void drain(PluginCall call) {
        JSONArray a = TimerStore.drain(getContext());
        JSObject r = new JSObject();
        try {
            r.put("timers", new com.getcapacitor.JSArray(a.toString()));
        } catch (JSONException e) {
            r.put("timers", new com.getcapacitor.JSArray());
        }
        call.resolve(r);
    }

    @PluginMethod
    public void permission(PluginCall call) {
        JSObject r = new JSObject();
        r.put("state", Build.VERSION.SDK_INT < 33 ? "granted" : getPermissionState("notifications").toString());
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            permission(call);
            return;
        }
        requestPermissionForAlias("notifications", call, "permissionDone");
    }

    @PermissionCallback
    private void permissionDone(PluginCall call) {
        permission(call);
    }
}
