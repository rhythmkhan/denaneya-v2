package com.denaneya.forwarder.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.denaneya.forwarder.data.AppPreferences
import com.denaneya.forwarder.service.ForwarderService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val prefs = AppPreferences(context)
            Log.d("DenaNeyaBoot", "Device boot completed. Service enabled: ${prefs.isServiceEnabled}")

            if (prefs.isServiceEnabled) {
                ForwarderService.start(context)
            }
        }
    }
}
