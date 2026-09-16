package com.denaneya.forwarder.data

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class DispatchResult(
    val isSuccess: Boolean,
    val statusCode: Int,
    val responseBody: String,
    val errorMessage: String? = null
)

object NetworkDispatcher {
    private const val TAG = "DenaNeyaNetwork"

    suspend fun syncSms(
        serverUrl: String,
        deviceToken: String,
        sender: String,
        message: String,
        simSlot: Int = 1
    ): DispatchResult = withContext(Dispatchers.IO) {
        try {
            val url = URL(serverUrl)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 20000
                doOutput = true
                doInput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "DenaNeya-Forwarder-Android/2.0")
                if (deviceToken.isNotBlank()) {
                    setRequestProperty("X-Device-Token", deviceToken)
                    setRequestProperty("device-api-key", deviceToken)
                }
            }

            val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
            val jsonPayload = JSONObject().apply {
                put("sender", sender)
                put("message", message)
                put("sim_slot", simSlot)
                put("timestamp", dateFormat.format(Date()))
            }

            OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                writer.write(jsonPayload.toString())
                writer.flush()
            }

            val statusCode = connection.responseCode
            val isSuccess = statusCode in 200..299

            val reader = if (isSuccess) {
                BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
            } else {
                val errorStream = connection.errorStream
                if (errorStream != null) {
                    BufferedReader(InputStreamReader(errorStream, "UTF-8"))
                } else {
                    BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
                }
            }

            val responseString = reader.use { it.readText() }
            connection.disconnect()

            Log.d(TAG, "Sync SMS Code: $statusCode, Response: $responseString")
            DispatchResult(
                isSuccess = isSuccess,
                statusCode = statusCode,
                responseBody = responseString
            )
        } catch (e: Exception) {
            Log.e(TAG, "Sync SMS Exception: ${e.message}", e)
            DispatchResult(
                isSuccess = false,
                statusCode = 0,
                responseBody = "",
                errorMessage = e.message ?: "Connection failed"
            )
        }
    }

    suspend fun sendHeartbeat(
        heartbeatUrl: String,
        deviceToken: String,
        batteryLevel: Int,
        sim1Operator: String? = null,
        sim2Operator: String? = null
    ): DispatchResult = withContext(Dispatchers.IO) {
        try {
            val url = URL(heartbeatUrl)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10000
                readTimeout = 15000
                doOutput = true
                doInput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "DenaNeya-Forwarder-Android/2.0")
                if (deviceToken.isNotBlank()) {
                    setRequestProperty("X-Device-Token", deviceToken)
                    setRequestProperty("device-api-key", deviceToken)
                }
            }

            val jsonPayload = JSONObject().apply {
                put("battery_level", batteryLevel)
                if (!sim1Operator.isNullOrBlank()) put("sim1_operator", sim1Operator)
                if (!sim2Operator.isNullOrBlank()) put("sim2_operator", sim2Operator)
            }

            OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                writer.write(jsonPayload.toString())
                writer.flush()
            }

            val statusCode = connection.responseCode
            val isSuccess = statusCode in 200..299

            val reader = if (isSuccess) {
                BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
            } else {
                val errorStream = connection.errorStream
                if (errorStream != null) {
                    BufferedReader(InputStreamReader(errorStream, "UTF-8"))
                } else {
                    BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
                }
            }

            val responseString = reader.use { it.readText() }
            connection.disconnect()

            DispatchResult(
                isSuccess = isSuccess,
                statusCode = statusCode,
                responseBody = responseString
            )
        } catch (e: Exception) {
            DispatchResult(
                isSuccess = false,
                statusCode = 0,
                responseBody = "",
                errorMessage = e.message ?: "Heartbeat failed"
            )
        }
    }

    suspend fun testConnection(
        serverUrl: String,
        deviceToken: String
    ): DispatchResult = withContext(Dispatchers.IO) {
        try {
            // Check status endpoint
            val baseUrl = if (serverUrl.contains("/api/")) {
                serverUrl.substring(0, serverUrl.indexOf("/api/"))
            } else {
                serverUrl
            }
            val statusUrl = "$baseUrl/api/device/status"
            val url = URL(statusUrl)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 10000
                readTimeout = 15000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "DenaNeya-Forwarder-Android/2.0")
                if (deviceToken.isNotBlank()) {
                    setRequestProperty("X-Device-Token", deviceToken)
                    setRequestProperty("device-api-key", deviceToken)
                }
            }

            val statusCode = connection.responseCode
            val isSuccess = statusCode in 200..299

            val reader = if (isSuccess) {
                BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
            } else {
                val errorStream = connection.errorStream
                if (errorStream != null) {
                    BufferedReader(InputStreamReader(errorStream, "UTF-8"))
                } else {
                    BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
                }
            }

            val responseString = reader.use { it.readText() }
            connection.disconnect()

            DispatchResult(
                isSuccess = isSuccess,
                statusCode = statusCode,
                responseBody = responseString
            )
        } catch (e: Exception) {
            DispatchResult(
                isSuccess = false,
                statusCode = 0,
                responseBody = "",
                errorMessage = e.message ?: "Connection check failed"
            )
        }
    }
}
