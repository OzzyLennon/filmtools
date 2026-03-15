package com.ozzylennon.filmtools

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.CountDownTimer
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import java.util.Locale

class TimerService : Service() {

    private var countDownTimer: CountDownTimer? = null
    private lateinit var notificationManager: NotificationManager
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        const val CHANNEL_ID = "filmtools_timer_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.ozzylennon.filmtools.ACTION_START_TIMER"
        const val ACTION_STOP = "com.ozzylennon.filmtools.ACTION_STOP_TIMER"
        const val EXTRA_TOTAL_SECONDS = "totalSeconds"
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        val action = intent.action

        if (ACTION_STOP == action) {
            stopCountdown()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        // Default: start timer
        val totalSeconds = intent.getIntExtra(EXTRA_TOTAL_SECONDS, 0)
        if (totalSeconds <= 0) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification(formatTime(totalSeconds), false))
        startCountdown(totalSeconds)

        return START_NOT_STICKY
    }

    private fun startCountdown(totalSeconds: Int) {
        countDownTimer?.cancel()
        releaseWakeLock()
        acquireWakeLock()

        countDownTimer = object : CountDownTimer(totalSeconds * 1000L, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val remaining = (millisUntilFinished / 1000).toInt()
                notificationManager.notify(NOTIFICATION_ID, buildNotification(formatTime(remaining), false))
            }

            override fun onFinish() {
                // Show "complete" notification with localized text
                val completeEmoji = "✅ " + getString(R.string.timer_complete)

                // Drop foreground status but KEEP the notification
                stopForeground(STOP_FOREGROUND_DETACH)

                // Issue the persistent completion notification
                notificationManager.notify(NOTIFICATION_ID, buildNotification(completeEmoji, true))
                VibrationHelper.vibrate(this@TimerService, 1000)
                
                releaseWakeLock()

                // Service fulfilled its purpose, kill it to save memory
                stopSelf()
            }
        }.start()
    }

    private fun stopCountdown() {
        countDownTimer?.cancel()
        countDownTimer = null
        releaseWakeLock()
    }

    private fun buildNotification(contentText: String, isComplete: Boolean): Notification {
        // Create an intent to bring the app back to foreground when tapped
        val tapIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingTapIntent = PendingIntent.getActivity(
            this, 0, tapIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Stop action button
        val stopIntent = Intent(this, TimerService::class.java).apply {
            action = ACTION_STOP
        }
        val pendingStopIntent = PendingIntent.getService(
            this, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = getString(if (isComplete) R.string.timer_complete else R.string.timer_countdown)

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title)
            .setContentText(contentText)
            .setContentIntent(pendingTapIntent)
            .setOngoing(!isComplete)
            .setOnlyAlertOnce(true)
            .setSilent(!isComplete)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        if (!isComplete) {
            builder.addAction(android.R.drawable.ic_media_pause, getString(R.string.timer_stop), pendingStopIntent)
        }

        return builder.build()
    }

    private fun formatTime(totalSeconds: Int): String {
        val min = totalSeconds / 60
        val sec = totalSeconds % 60
        return String.format(Locale.getDefault(), "%02d:%02d", min, sec)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.timer_countdown),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.timer_channel_description)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        stopCountdown()
        releaseWakeLock()
        super.onDestroy()
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "FilmTools::TimerWakeLock").apply {
            acquire(3 * 60 * 60 * 1000L) // 3 hours max timeout as safety net
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
            }
        }
        wakeLock = null
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
