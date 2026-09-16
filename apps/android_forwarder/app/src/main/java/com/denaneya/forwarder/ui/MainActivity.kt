package com.denaneya.forwarder.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.denaneya.forwarder.data.AppPreferences
import com.denaneya.forwarder.data.NetworkDispatcher
import com.denaneya.forwarder.data.SmsLogItem
import com.denaneya.forwarder.service.ForwarderService
import com.denaneya.forwarder.ui.theme.*
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {

    private lateinit var prefs: AppPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = AppPreferences(this)

        if (prefs.isServiceEnabled && prefs.deviceToken.isNotBlank()) {
            ForwarderService.start(this)
        }

        setContent {
            DenaNeyaTheme {
                MainScreen(prefs = prefs)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(prefs: AppPreferences) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var isServiceEnabled by remember { mutableStateOf(prefs.isServiceEnabled) }
    var serverUrl by remember { mutableStateOf(prefs.serverUrl) }
    var heartbeatUrl by remember { mutableStateOf(prefs.heartbeatUrl) }
    var deviceToken by remember { mutableStateOf(prefs.deviceToken) }
    var logsList by remember { mutableStateOf(prefs.getLogs()) }
    var totalCount by remember { mutableStateOf(prefs.totalForwardedCount) }

    var showPairModal by remember { mutableStateOf(false) }
    var pastedPairingText by remember { mutableStateOf("") }
    var isTestingConnection by remember { mutableStateOf(false) }
    var testResultStatus by remember { mutableStateOf<String?>(null) }

    fun hasSmsPermissions(): Boolean {
        val receiveGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED
        val readGranted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED
        val notifGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else true

        return receiveGranted && readGranted && notifGranted
    }

    var hasPermissions by remember { mutableStateOf(hasSmsPermissions()) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        hasPermissions = hasSmsPermissions()
        if (hasPermissions) {
            Toast.makeText(context, "অনুমতি নিশ্চিত করা হয়েছে", Toast.LENGTH_SHORT).show()
        }
    }

    fun isIgnoringBatteryOptimizations(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(context.packageName)
        } else true
    }

    var isBatteryOptIgnored by remember { mutableStateOf(isIgnoringBatteryOptimizations()) }

    fun refreshState() {
        logsList = prefs.getLogs()
        totalCount = prefs.totalForwardedCount
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.White),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "দে",
                                color = EmeraldPrimary,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 18.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "দেনা নেয়া ফরোয়ার্ডার",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "DenaNeya v2.0 • Direct-to-SIM",
                                style = MaterialTheme.typography.labelSmall,
                                color = Emerald80
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = EmeraldDark
                ),
                actions = {
                    Row(
                        modifier = Modifier
                            .padding(end = 12.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isServiceEnabled) EmeraldPrimary else Slate700)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isServiceEnabled) "সক্রিয়" else "পজড",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Slate100)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (!hasPermissions) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "⚠️ এসএমএস পারমিশন প্রয়োজন",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF92400E),
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "বিকাশ/নগদ এসএমএস সার্ভারে অটো-সিঙ্ক করার জন্য SMS Receive ও Read পারমিশন আবশ্যক।",
                                fontSize = 12.sp,
                                color = Color(0xFF78350F)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Button(
                                onClick = {
                                    val permissionsToRequest = mutableListOf(
                                        Manifest.permission.RECEIVE_SMS,
                                        Manifest.permission.READ_SMS
                                    )
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                        permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
                                    }
                                    permissionLauncher.launch(permissionsToRequest.toTypedArray())
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("অনুমতি দিন (Grant Permissions)", color = Color.White, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            if (!isBatteryOptIgnored) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "🔋 ব্যাকগ্রাউন্ড অপ্টিমাইজেশন",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E40AF),
                                fontSize = 14.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "অ্যান্ড্রয়েড যেন ব্যাকগ্রাউন্ডে ফরোয়ার্ডার বন্ধ না করে, ব্যাটারি অপ্টিমাইজেশন নিষ্ক্রিয় করুন।",
                                fontSize = 12.sp,
                                color = Color(0xFF1E3A8A)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Button(
                                onClick = {
                                    try {
                                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                            data = Uri.parse("package:" + context.packageName)
                                        }
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "সেটিংস থেকে ম্যানুয়ালি এলাও করুন", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("ব্যাটারি অপ্টিমাইজেশন নিষ্ক্রিয় করুন", color = Color.White, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(14.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "স্বয়ংক্রিয় এসএমএস সিঙ্ক সার্ভিস",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = Slate900
                                )
                                Text(
                                    text = if (isServiceEnabled) "সার্ভার লাইভ কানেক্টেড এবং ফরোয়ার্ডিং চালু" else "ফরোয়ার্ডিং সাময়িকভাবে স্থগিত",
                                    fontSize = 12.sp,
                                    color = if (isServiceEnabled) EmeraldPrimary else Slate500
                                )
                            }
                            Switch(
                                checked = isServiceEnabled,
                                onCheckedChange = { checked ->
                                    isServiceEnabled = checked
                                    prefs.isServiceEnabled = checked
                                    if (checked) {
                                        ForwarderService.start(context)
                                        Toast.makeText(context, "ফরোয়ার্ডার চালু হয়েছে", Toast.LENGTH_SHORT).show()
                                    } else {
                                        ForwarderService.stop(context)
                                        Toast.makeText(context, "ফরোয়ার্ডার বন্ধ করা হয়েছে", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            )
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = Slate200)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("মোট ফরোয়ার্ড", fontSize = 11.sp, color = Slate500)
                                Text("$totalCount টি এসএমএস", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Slate900)
                            }

                            Column {
                                Text("সর্বশেষ সিঙ্ক", fontSize = 11.sp, color = Slate500)
                                val ts = prefs.lastSyncTimestamp
                                val formatted = if (ts > 0) {
                                    SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(ts))
                                } else "এখনো হয়নি"
                                Text(formatted, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Slate800)
                            }
                        }
                    }
                }
            }

            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(14.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "সার্ভার ও ডিভাইস পেয়ারিং",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Slate900
                            )

                            TextButton(onClick = { showPairModal = true }) {
                                Text("ডাটা পেস্ট করুন", fontSize = 12.sp, color = EmeraldDark)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = serverUrl,
                            onValueChange = { serverUrl = it },
                            label = { Text("Server Sync Endpoint URL") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            textStyle = LocalTextStyle.current.copy(fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = deviceToken,
                            onValueChange = { deviceToken = it },
                            label = { Text("Device Secret Token (tok_dev_...)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            textStyle = LocalTextStyle.current.copy(fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    prefs.serverUrl = serverUrl
                                    prefs.heartbeatUrl = heartbeatUrl
                                    prefs.deviceToken = deviceToken
                                    Toast.makeText(context, "কনফিগারেশন সেভ হয়েছে", Toast.LENGTH_SHORT).show()
                                    if (isServiceEnabled) {
                                        ForwarderService.start(context)
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("সেভ করুন", color = Color.White, fontSize = 12.sp)
                            }

                            OutlinedButton(
                                onClick = {
                                    isTestingConnection = true
                                    testResultStatus = null
                                    coroutineScope.launch {
                                        val res = NetworkDispatcher.testConnection(serverUrl, deviceToken)
                                        isTestingConnection = false
                                        if (res.isSuccess) {
                                            testResultStatus = "✅ সার্ভার সফলভাবে রেসপন্ড করেছে (HTTP " + res.statusCode + ")"
                                        } else {
                                            testResultStatus = "❌ সংযোগ ব্যর্থ: " + (res.errorMessage ?: ("HTTP " + res.statusCode))
                                        }
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(if (isTestingConnection) "টেস্টিং..." else "সংযোগ চেক", fontSize = 12.sp)
                            }
                        }

                        if (testResultStatus != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = testResultStatus!!,
                                fontSize = 12.sp,
                                color = if (testResultStatus!!.startsWith("✅")) EmeraldDark else Color.Red
                            )
                        }
                    }
                }
            }

            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(14.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "🧪 টেস্ট এসএমএস সিমুলেশন",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Slate900
                        )
                        Text(
                            text = "সরাসরি ফোন থেকে ডামি বিকাশ বা নগদ এসএমএস পাঠিয়ে সার্ভার ভেরিফিকেশন পরীক্ষা করুন:",
                            fontSize = 11.sp,
                            color = Slate500
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    val randomTrx = "BLK" + UUID.randomUUID().toString().substring(0, 7).uppercase()
                                    val dummyBkash = "You have received Tk 1,250.00 from 01711002233. Fee Tk 0.00. Balance Tk 45,210.00. TrxID " + randomTrx
                                    coroutineScope.launch {
                                        val res = NetworkDispatcher.syncSms(serverUrl, deviceToken, "bKash", dummyBkash)
                                        if (res.isSuccess) {
                                            prefs.incrementForwarded()
                                            prefs.addLog("bKash", dummyBkash, "TEST_SUCCESS", "টাকা: ৳1250 | TrxID: " + randomTrx)
                                            Toast.makeText(context, "bKash টেস্ট সফল: " + randomTrx, Toast.LENGTH_SHORT).show()
                                        } else {
                                            prefs.addLog("bKash", dummyBkash, "TEST_FAILED", res.errorMessage ?: ("HTTP " + res.statusCode))
                                            Toast.makeText(context, "টেস্ট ব্যর্থ: " + res.errorMessage, Toast.LENGTH_SHORT).show()
                                        }
                                        refreshState()
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2136E)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("bKash টেস্ট এসএমএস", color = Color.White, fontSize = 11.sp)
                            }

                            Button(
                                onClick = {
                                    val randomTrx = "7NG" + UUID.randomUUID().toString().substring(0, 7).uppercase()
                                    val dummyNagad = "Received Tk 750.00 from 01822334455. Commission Tk 0.00. Balance Tk 15,200.00. TxnID " + randomTrx
                                    coroutineScope.launch {
                                        val res = NetworkDispatcher.syncSms(serverUrl, deviceToken, "16167", dummyNagad)
                                        if (res.isSuccess) {
                                            prefs.incrementForwarded()
                                            prefs.addLog("Nagad", dummyNagad, "TEST_SUCCESS", "টাকা: ৳750 | TxnID: " + randomTrx)
                                            Toast.makeText(context, "Nagad টেস্ট সফল: " + randomTrx, Toast.LENGTH_SHORT).show()
                                        } else {
                                            prefs.addLog("Nagad", dummyNagad, "TEST_FAILED", res.errorMessage ?: ("HTTP " + res.statusCode))
                                            Toast.makeText(context, "টেস্ট ব্যর্থ: " + res.errorMessage, Toast.LENGTH_SHORT).show()
                                        }
                                        refreshState()
                                    }
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF7941D)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Nagad টেস্ট এসএমএস", color = Color.White, fontSize = 11.sp)
                            }
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "রিয়েল-টাইম ফরোয়ার্ডিং লগ (" + logsList.size + ")",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Slate900
                    )

                    if (logsList.isNotEmpty()) {
                        TextButton(
                            onClick = {
                                prefs.clearLogs()
                                refreshState()
                            }
                        ) {
                            Text("লগ মুছুন", color = Color.Red, fontSize = 12.sp)
                        }
                    }
                }
            }

            if (logsList.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "এখনো কোনো এসএমএস ফরোয়ার্ড হয়নি।\nবিকাশ/নগদ এসএমএস আসলে এখানে লাইভ দেখতে পাবেন।",
                            fontSize = 12.sp,
                            color = Slate500,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            } else {
                items(logsList) { item ->
                    LogItemRow(item = item)
                }
            }
        }
    }

    if (showPairModal) {
        AlertDialog(
            onDismissRequest = { showPairModal = false },
            title = { Text("ড্যাশবোর্ড পেয়ারিং কোড পেস্ট করুন", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column {
                    Text(
                        "দেনা নেয়া ড্যাশবোর্ডের Devices পেজ থেকে 'Forwarder Config' JSON কোড অথবা Device Token টি কপি করে এখানে পেস্ট করুন:",
                        fontSize = 12.sp,
                        color = Slate700
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = pastedPairingText,
                        onValueChange = { pastedPairingText = it },
                        placeholder = { Text("{\"version\":\"2.0\",\"device_token\":\"...\"}") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp),
                        shape = RoundedCornerShape(8.dp),
                        textStyle = LocalTextStyle.current.copy(fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val input = pastedPairingText.trim()
                        if (input.startsWith("{")) {
                            try {
                                val json = JSONObject(input)
                                if (json.has("device_token")) {
                                    deviceToken = json.getString("device_token")
                                    prefs.deviceToken = deviceToken
                                }
                                if (json.has("sync_url")) {
                                    serverUrl = json.getString("sync_url")
                                    prefs.serverUrl = serverUrl
                                } else if (json.has("api_base")) {
                                    serverUrl = json.getString("api_base") + "/api/device/sync-sms"
                                    prefs.serverUrl = serverUrl
                                }
                                if (json.has("heartbeat_url")) {
                                    heartbeatUrl = json.getString("heartbeat_url")
                                    prefs.heartbeatUrl = heartbeatUrl
                                }
                                Toast.makeText(context, "পেয়ারিং ডাটা সফলভাবে সেট হয়েছে!", Toast.LENGTH_SHORT).show()
                                showPairModal = false
                            } catch (e: Exception) {
                                Toast.makeText(context, "ভুল JSON ফরম্যাট", Toast.LENGTH_SHORT).show()
                            }
                        } else if (input.startsWith("tok_dev_")) {
                            deviceToken = input
                            prefs.deviceToken = input
                            Toast.makeText(context, "ডিভাইস টোকেন সেভ হয়েছে", Toast.LENGTH_SHORT).show()
                            showPairModal = false
                        } else {
                            Toast.makeText(context, "সঠিক টোকেন বা JSON পেস্ট করুন", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
                ) {
                    Text("প্রয়োগ করুন", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showPairModal = false }) {
                    Text("বাতিল")
                }
            }
        )
    }
}

@Composable
fun LogItemRow(item: SmsLogItem) {
    val isSuccess = item.status.contains("SUCCESS")
    val isWarning = item.status == "WARNING"
    val isDuplicate = item.status == "DUPLICATE"

    val badgeColor = when {
        isSuccess -> Color(0xFF059669)
        isDuplicate -> Color(0xFF2563EB)
        isWarning -> Color(0xFFD97706)
        else -> Color(0xFFDC2626)
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(badgeColor.copy(alpha = 0.15f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = item.sender,
                            color = badgeColor,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = item.status,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = badgeColor
                    )
                }

                val timeStr = SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(Date(item.timestamp))
                Text(timeStr, fontSize = 10.sp, color = Slate500)
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = item.details,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                color = Slate800
            )

            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = item.snippet,
                fontSize = 11.sp,
                color = Slate500,
                maxLines = 2
            )
        }
    }
}
