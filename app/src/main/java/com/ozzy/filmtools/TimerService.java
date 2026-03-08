package com.ozzylennon.filmtools;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

public class TimerService extends Service {

    public static final String CHANNEL_ID = "filmtools_timer_channel";
    public static final int NOTIFICATION_ID = 1001;
    public static final String ACTION_START = "com.ozzylennon.filmtools.ACTION_START_TIMER";
    public static final String ACTION_STOP = "com.ozzylennon.filmtools.ACTION_STOP_TIMER";
    public static final String EXTRA_TOTAL_SECONDS = "totalSeconds";

    private CountDownTimer countDownTimer;
    private NotificationManager notificationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();

        if (ACTION_STOP.equals(action)) {
            stopCountdown();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        // Default: start timer
        int totalSeconds = intent.getIntExtra(EXTRA_TOTAL_SECONDS, 0);
        if (totalSeconds <= 0) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification(formatTime(totalSeconds), false));
        startCountdown(totalSeconds);

        return START_NOT_STICKY;
    }

    private void startCountdown(int totalSeconds) {
        if (countDownTimer != null) {
            countDownTimer.cancel();
        }

        countDownTimer = new CountDownTimer(totalSeconds * 1000L, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int remaining = (int) (millisUntilFinished / 1000);
                notificationManager.notify(NOTIFICATION_ID, buildNotification(formatTime(remaining), false));
            }

            @Override
            public void onFinish() {
                // Show "complete" notification with localized text
                String completeEmoji = "✅ " + getString(R.string.timer_complete);

                // Drop foreground status but KEEP the notification
                stopForeground(false);

                // Issue the persistent completion notification
                notificationManager.notify(NOTIFICATION_ID, buildNotification(completeEmoji, true));
                VibrationHelper.vibrate(TimerService.this, 1000);

                // Service fulfilled its purpose, kill it to save memory
                stopSelf();
            }
        };
        countDownTimer.start();
    }

    private void stopCountdown() {
        if (countDownTimer != null) {
            countDownTimer.cancel();
            countDownTimer = null;
        }
    }

    private Notification buildNotification(String contentText, boolean isComplete) {
        // Create an intent to bring the app back to foreground when tapped
        Intent tapIntent = new Intent(this, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingTapIntent = PendingIntent.getActivity(
                this, 0, tapIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Stop action button
        Intent stopIntent = new Intent(this, TimerService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent pendingStopIntent = PendingIntent.getService(
                this, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(getString(isComplete ? R.string.timer_complete : R.string.timer_countdown))
                .setContentText(contentText)
                .setContentIntent(pendingTapIntent)
                .setOngoing(!isComplete)
                .setOnlyAlertOnce(true)
                .setSilent(!isComplete)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (!isComplete) {
            builder.addAction(android.R.drawable.ic_media_pause, getString(R.string.timer_stop), pendingStopIntent);
        }

        return builder.build();
    }

    private String formatTime(int totalSeconds) {
        int min = totalSeconds / 60;
        int sec = totalSeconds % 60;
        return String.format(java.util.Locale.getDefault(), "%02d:%02d", min, sec);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.timer_countdown),
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription(getString(R.string.timer_channel_description));
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            notificationManager.createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {
        stopCountdown();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
