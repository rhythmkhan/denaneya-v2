package com.denaneya.forwarder.data

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

data class SmsLogItem(
    val id: String,
    val sender: String,
    val snippet: String,
    val status: String, // SUCCESS, DUPLICATE, REJECTED, ERROR, TEST
    val details: String,
    val timestamp: Long
)

class AppPreferences(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("denaneya_forwarder_prefs", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value.trim()).apply()

    var heartbeatUrl: String
        get() = prefs.getString(KEY_HEARTBEAT_URL, DEFAULT_HEARTBEAT_URL) ?: DEFAULT_HEARTBEAT_URL
        set(value) = prefs.edit().putString(KEY_HEARTBEAT_URL, value.trim()).apply()

    var deviceToken: String
        get() = prefs.getString(KEY_DEVICE_TOKEN, "") ?: ""
        set(value) = prefs.edit().putString(KEY_DEVICE_TOKEN, value.trim()).apply()

    var isServiceEnabled: Boolean
        get() = prefs.getBoolean(KEY_SERVICE_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_SERVICE_ENABLED, value).apply()

    var lastSyncTimestamp: Long
        get() = prefs.getLong(KEY_LAST_SYNC_TS, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_SYNC_TS, value).apply()

    var totalForwardedCount: Int
        get() = prefs.getInt(KEY_TOTAL_FORWARDED, 0)
        set(value) = prefs.edit().putInt(KEY_TOTAL_FORWARDED, value).apply()

    fun incrementForwarded() {
        totalForwardedCount = totalForwardedCount + 1
        lastSyncTimestamp = System.currentTimeMillis()
    }

    fun addLog(sender: String, snippet: String, status: String, details: String) {
        val currentLogs = getLogs().toMutableList()
        val newItem = SmsLogItem(
            id = "log_${System.currentTimeMillis()}_${(100..999).random()}",
            sender = sender,
            snippet = if (snippet.length > 120) snippet.substring(0, 117) + "..." else snippet,
            status = status,
            details = details,
            timestamp = System.currentTimeMillis()
        )
        currentLogs.add(0, newItem) // Newest first

        // Keep maximum 50 recent items
        val trimmed = if (currentLogs.size > 50) currentLogs.subList(0, 50) else currentLogs
        val jsonArray = JSONArray()
        for (item in trimmed) {
            val obj = JSONObject().apply {
                put("id", item.id)
                put("sender", item.sender)
                put("snippet", item.snippet)
                put("status", item.status)
                put("details", item.details)
                put("timestamp", item.timestamp)
            }
            jsonArray.put(obj)
        }
        prefs.edit().putString(KEY_LOGS_JSON, jsonArray.toString()).apply()
    }

    fun getLogs(): List<SmsLogItem> {
        val raw = prefs.getString(KEY_LOGS_JSON, null) ?: return emptyList()
        val list = mutableListOf<SmsLogItem>()
        try {
            val jsonArray = JSONArray(raw)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                list.add(
                    SmsLogItem(
                        id = obj.optString("id", "log_$i"),
                        sender = obj.optString("sender", "Unknown"),
                        snippet = obj.optString("snippet", ""),
                        status = obj.optString("status", "INFO"),
                        details = obj.optString("details", ""),
                        timestamp = obj.optLong("timestamp", System.currentTimeMillis())
                    )
                )
            }
        } catch (e: Exception) {
            // Return whatever parsed
        }
        return list
    }

    fun clearLogs() {
        prefs.edit().remove(KEY_LOGS_JSON).apply()
    }

    companion object {
        const val DEFAULT_SERVER_URL = "https://denaneya.aihaat.shop/api/device/sync-sms"
        const val DEFAULT_HEARTBEAT_URL = "https://denaneya.aihaat.shop/api/device/heartbeat"

        private const val KEY_SERVER_URL = "key_server_url"
        private const val KEY_HEARTBEAT_URL = "key_heartbeat_url"
        private const val KEY_DEVICE_TOKEN = "key_device_token"
        private const val KEY_SERVICE_ENABLED = "key_service_enabled"
        private const val KEY_LAST_SYNC_TS = "key_last_sync_ts"
        private const val KEY_TOTAL_FORWARDED = "key_total_forwarded"
        private const val KEY_LOGS_JSON = "key_logs_json"
    }
}
