package app.streakcalendar;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

final class TimerNotifier {
    private static final String CHANNEL = "timer";
    private static final int ID = 7301;

    private TimerNotifier() {
    }

    private static NotificationManager nm(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null)
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Timer", NotificationManager.IMPORTANCE_DEFAULT));
        return nm;
    }

    private static Notification.Builder builder(Context ctx) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open != null) b.setContentIntent(PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return b.setSmallIcon(R.drawable.ic_launcher_monochrome).setContentTitle(ctx.getString(R.string.app_name));
    }

    static void showRunning(Context ctx, TimerState.Timer t, String name) {
        NotificationManager nm = nm(ctx);
        if (nm == null) return;
        Intent stop = new Intent(ctx, TimerReceiver.class).setAction(TimerReceiver.ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getBroadcast(ctx, 2, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = builder(ctx)
                .setContentText(("delay".equals(t.kind) ? "Wait it out: " : "Just start: ") + name)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setWhen(t.endsAt)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .addAction(new Notification.Action.Builder(null, "Stop", stopPi).build());
        if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true);
        nm.notify(ID, b.build());
    }

    static void showDone(Context ctx, TimerState.Timer t, String name) {
        NotificationManager nm = nm(ctx);
        if (nm == null) return;
        nm.notify(ID, builder(ctx).setAutoCancel(true)
                .setContentText(("delay".equals(t.kind) ? "Urge resisted: " : "Done for today: ") + name).build());
    }

    static void clear(Context ctx) {
        NotificationManager nm = nm(ctx);
        if (nm != null) nm.cancel(ID);
    }
}
