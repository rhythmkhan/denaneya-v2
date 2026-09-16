package com.denaneya.forwarder.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.denaneya.forwarder.R
import com.denaneya.forwarder.data.AppPreferences
import com.denaneya.forwarder.data.NetworkDispatcher
import com.denaneya.forwarder.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class ForwarderService : Service() {

    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)
    private var wakeLock: PowerManager.WakeLock? = null
    private lateinit var prefs: AppPreferences

    override fun onCreate() {
        super.onCreate()
        prefs = AppPreferences(this)
        Log.d(TAG, "ForwarderService onCreate()")

        // 1. Acquire Partial WakeLock to prevent CPU deep sleep
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DenaNeyaForwarder::ForegroundWakeLock"
            ).apply {
                setReferenceCounted(false)
                acquire(10 * 60 * 1000L) // Initial acquire
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to acquire wake lock: ${e.message}")
        }

        // 2. Start Foreground Notification
        createNotificationChannel()
        val notification = buildForegroundNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // 3. Start Periodic Heartbeat Coroutine
        startHeartbeatLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "ForwarderService onStartCommand()")
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "ForwarderService onDestroy()")
        serviceJob.cancel()
        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing wake lock: ${e.message}")
        }
    }

    private fun startHeartbeatLoop() {
        serviceScope.launch {
            while (isActive) {
                try {
                    val token = prefs.deviceToken
                    val heartbeatUrl = prefs.heartbeatUrl

                    if (token.isNotBlank() && prefs.isServiceEnabled) {
                        val battery = getBatteryPercentage()
                        NetworkDispatcher.sendHeartbeat(
                            heartbeatUrl = heartbeatUrl,
                            deviceToken = token,
                            batteryLevel = battery
                        )
                        Log.d(TAG, "Sent heartbeat telemetry. Battery: $battery%")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Heartbeat ping failure: ${e.message}")
                }

                // Heartbeat interval: 90 seconds
                delay(90_000L)
            }
        }
    }

    private fun getBatteryPercentage(): Int {
        return try {
            val batteryStatus: Intent? = registerReceiver(
                null,
                IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            )
            val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (level >= 0 && scale > 0) {
                (level * 100 / scale)
            } else {
                100
            }
        } catch (e: Exception) {
            100
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.channel_desc)
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(getString(R.string.service_running_title))
            .setContentText(getString(R.string.service_running_desc))
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        const val CHANNEL_ID = "denaneya_forwarder_channel"
        const val NOTIFICATION_ID = 9988
        private const val TAG = "DenaNeyaService"

        fun start(context: Context) {
            val intent = Intent(context, ForwarderService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, ForwarderService::class.java)
            context.stopService(intent)
        }
    }
}
