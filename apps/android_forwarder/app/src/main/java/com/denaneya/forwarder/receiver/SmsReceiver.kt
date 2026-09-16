package com.denaneya.forwarder.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.denaneya.forwarder.data.AppPreferences
import com.denaneya.forwarder.data.NetworkDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = AppPreferences(context)
        if (!prefs.isServiceEnabled) {
            Log.d(TAG, "Forwarder service is paused in settings. Skipping SMS.")
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (messages.isEmpty()) return

        // Aggregate multi-part SMS messages by sender
        val bodyBuilder = StringBuilder()
        var senderAddress = ""

        for (sms in messages) {
            if (senderAddress.isEmpty()) {
                senderAddress = sms.displayOriginatingAddress ?: sms.originatingAddress ?: ""
            }
            bodyBuilder.append(sms.displayMessageBody ?: sms.messageBody ?: "")
        }

        val fullBody = bodyBuilder.toString().trim()
        val sender = senderAddress.trim()

        Log.d(TAG, "Incoming SMS from '$sender': $fullBody")

        // Validate whether this SMS belongs to Bangladeshi MFS or financial transaction
        if (!isFinancialOrMfsSms(sender, fullBody)) {
            Log.d(TAG, "SMS does not match MFS or financial transaction criteria. Ignored.")
            return
        }

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val serverUrl = prefs.serverUrl
                val deviceToken = prefs.deviceToken

                if (deviceToken.isBlank()) {
                    prefs.addLog(
                        sender = sender,
                        snippet = fullBody,
                        status = "WARNING",
                        details = "ডিভাইস টোকেন কনফিগার করা নেই! ড্যাশবোর্ড থেকে টোকেন সেট করুন।"
                    )
                    return@launch
                }

                val result = NetworkDispatcher.syncSms(
                    serverUrl = serverUrl,
                    deviceToken = deviceToken,
                    sender = sender,
                    message = fullBody,
                    simSlot = 1
                )

                if (result.isSuccess) {
                    var status = "SUCCESS"
                    var detailMsg = "সার্ভারে সফলভাবে ফরোয়ার্ড হয়েছে (HTTP ${result.statusCode})"

                    try {
                        val json = JSONObject(result.responseBody)
                        if (json.optBoolean("duplicate", false)) {
                            status = "DUPLICATE"
                            detailMsg = "আগে থেকেই প্রসেস করা ছিল (Duplicate TrxID)"
                        } else if (json.has("trx_id")) {
                            val trxId = json.getString("trx_id")
                            val amount = json.optDouble("amount", 0.0)
                            detailMsg = "টাকা: ৳$amount | TrxID: $trxId"
                        }
                    } catch (_: Exception) {}

                    prefs.incrementForwarded()
                    prefs.addLog(sender, fullBody, status, detailMsg)
                    Log.i(TAG, "SMS successfully forwarded to DenaNeya server.")
                } else {
                    var errDetail = result.errorMessage ?: "HTTP ${result.statusCode}"
                    try {
                        val json = JSONObject(result.responseBody)
                        if (json.has("message")) {
                            errDetail = json.getString("message")
                        }
                    } catch (_: Exception) {}

                    prefs.addLog(
                        sender = sender,
                        snippet = fullBody,
                        status = "FAILED",
                        details = "ব্যর্থ: $errDetail"
                    )
                    Log.e(TAG, "SMS sync failed: $errDetail")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in async SMS forwarding", e)
                prefs.addLog(sender, fullBody, "ERROR", e.message ?: "Unknown error")
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun isFinancialOrMfsSms(sender: String, body: String): Boolean {
        val s = sender.uppercase()
        val b = body.uppercase()

        // 1. Whitelisted Originating Addresses / Shortcodes
        val whitelistedSenders = listOf(
            "BKASH", "16247",
            "NAGAD", "16167",
            "ROCKET", "16216", "DBBL",
            "UPAY", "16268", "UCB",
            "CELLFIN", "IBBL", "CITYTOUCH", "EBL", "BRAC"
        )

        for (carrier in whitelistedSenders) {
            if (s.contains(carrier)) return true
        }

        // 2. Transaction Keywords in SMS Body
        if (b.contains("TRXID") ||
            b.contains("TXNID") ||
            b.contains("TRANSACTION ID") ||
            b.contains("YOU HAVE RECEIVED TK") ||
            b.contains("RECEIVED TK") ||
            (b.contains("TK.") && b.contains("BALANCE")) ||
            (b.contains("TK") && b.contains("SUCCESSFUL"))
        ) {
            return true
        }

        return false
    }

    companion object {
        private const val TAG = "DenaNeyaReceiver"
    }
}
