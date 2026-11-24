package app.streakcalendar;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;

public class TimerConflictActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        TimerState.Timer cur = TimerStore.current(this);
        String name = cur == null ? "" : TimerStore.habitName(this, cur.habitId);
        new AlertDialog.Builder(this)
                .setTitle("A timer is running")
                .setMessage("Cancel the " + name + " timer and start this one?")
                .setPositiveButton("Start this one", (d, w) -> {
                    TimerStore.cancel(this);
                    TimerReceiver.start(this, getIntent());
                    finish();
                })
                .setNegativeButton("Keep the running one", (d, w) -> finish())
                .setOnCancelListener(d -> finish())
                .show();
    }
}
