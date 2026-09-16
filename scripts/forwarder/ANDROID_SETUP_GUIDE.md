# DenaNeya v2.0 — Android SMS Forwarder & Handset Pairing Setup Guide

> **Official Merchant Hardware Manual**  
> **Platform:** দেনা নেয়া ভার্সন টু (DenaNeya v2.0)  
> **Architecture:** Zero-Commission Direct-to-SIM Automated Payment Pipeline  
> **Target Channels:** bKash, Nagad, Rocket (16216), Upay (16222)  

---

## 1. Architectural Overview

In traditional payment gateways, merchants pay 1.5% to 2.5% per transaction and face 24–72 hour settlement delays. **DenaNeya v2.0 eliminates all transaction fees and settlement delays** by allowing you to collect customer funds directly on your own physical Android smartphone hosting personal, agent, or merchant MFS SIM cards.

```
┌─────────────────┐       USSD / App        ┌─────────────────┐
│  End Customer   │ ──────────────────────► │  Merchant Phone │
│ (Transfers Tk)  │                         │ (MFS SIM Cards) │
└─────────────────┘                         └────────┬────────┘
                                                     │ 
                                            Carrier SMS Received
                                            (bKash / Nagad / Rocket)
                                                     │
                                                     ▼
┌─────────────────────────┐               ┌─────────────────────┐
│  DenaNeya v2.0 Cloud    │ ◄──────────── │ MacroDroid /        │
│  - Carrier Whitelist    │  HTTPS POST   │ SMS Forwarder       │
│  - Debit Blacklist      │  + Auth Token │ (Background Daemon) │
│  - Atomic CAS Reconcile │               └─────────────────────┘
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Merchant Webhook /      │
│ WooCommerce Instant Pay │
└─────────────────────────┘
```

When a customer pays via bKash, Nagad, Rocket, or Upay, Bangladesh telecommunication carriers (GP, Robi, Banglalink, Teletalk) deliver an official confirmation receipt via SMS to your handset. Your handset automatically captures the SMS, attaches your 192-bit cryptographic device token (`tok_dev_...`), and forwards it via HTTPS to `/api/device/sync-sms`. DenaNeya verifies the carrier sender mask, extracts the transaction ID and amount, reconciles pending invoices atomically, and notifies your store in real time.

---

## 2. Hardware & Telecom Prerequisites

| Requirement | Specification |
|---|---|
| **Operating System** | Android 8.0 (Oreo) or higher (Android 11, 12, 13, 14 fully tested). |
| **SIM Slots** | Dual-SIM capability recommended (e.g. SIM 1: bKash / Grameenphone, SIM 2: Nagad / Robi). |
| **Network Connectivity** | Continuous Wi-Fi connection with cellular mobile data fallback enabled. |
| **Power Supply** | Handset must remain plugged into a dedicated 5W–10W charging dock or adapter 24/7. |
| **Battery Health** | Use Android's "Protect Battery" (limit max charge to 80% or 85%) or a smart timer plug. |

---

## 3. Step 1: Handset Pairing & Token Generation

Every handset requires a unique 96-bit Device ID and 192-bit CSPRNG Pairing Token.

### Method A: Via Merchant Dashboard (Recommended)
1. Log in to your **DenaNeya Merchant Dashboard** (`https://denaneya.aihaat.shop` or your custom domain).
2. Go to **Devices & SMS** from the sidebar.
3. Click **"Pair New Android Handset"**.
4. Enter your handset label (e.g. `Counter 1 - Galaxy A15 MFS`) and phone model.
5. Click **"Generate Pairing Token"**.
6. The dashboard displays a scan-ready QR code and your plaintext device token (`tok_dev_...`).

### Method B: Via CLI Tool (For Developers / DevOps)
Run the automated pairing generator script from the project root:
```bash
node scripts/generate_device_pairing.cjs --brand-id "b101_deshi_course" --device-name "Main Office Handset" --save-db
```
The script will output:
* Your device credentials (`dev_...`, `tok_dev_...`)
* Canonical QR JSON payload
* ASCII QR code directly in the terminal for instant camera scanning.

---

## 4. Step 2: Forwarder Application Setup

Choose either **MacroDroid** (recommended for non-technical users; zero code) or **SMS Forwarder** (open-source; recommended for multi-SIM automation).

### Option A: MacroDroid Setup (Turnkey Template)

MacroDroid is a trusted automation app available on Google Play.

1. **Install MacroDroid:**
   Download and install **MacroDroid - Device Automation** from Google Play Store.
2. **Import Configuration Template:**
   * Copy the template file: `scripts/forwarder/denaneya_macrodroid_forwarder.json` to your phone (via USB, Google Drive, or WhatsApp).
   * Open MacroDroid -> tap the **Export/Import** button (or top-right three dots -> Import).
   * Select `denaneya_macrodroid_forwarder.json`.
3. **Configure Local Variables:**
   * In MacroDroid, open the imported macro **"DenaNeya v2.0 MFS Carrier Sync & Telemetry"**.
   * Under **Variables**, tap `dn_device_token` and paste your authentic token (`tok_dev_...`).
   * Verify `dn_sync_url` is set to `https://denaneya.aihaat.shop/api/device/sync-sms`.
   * Verify `dn_heartbeat_url` is set to `https://denaneya.aihaat.shop/api/device/heartbeat`.
4. **Enable the Macro:**
   * Toggle the macro switch in the top-right corner to **ON**.
   * Save the macro.

---

### Option B: SMS Forwarder Setup (Open Source)

SMS Forwarder is a lightweight, open-source forwarder available on F-Droid and GitHub (`pppssb/sms-forwarder`).

1. **Install SMS Forwarder:**
   Download the APK from GitHub Releases: `https://github.com/pppssb/sms-forwarder/releases` or F-Droid.
2. **Add Webhook Sender Channel:**
   * Open SMS Forwarder -> tap **Sender Channels** -> tap **+** (Add).
   * Select channel type: **Webhook**.
   * Name: `DenaNeya Ingestion`.
   * Webhook URL: `https://denaneya.aihaat.shop/api/device/sync-sms`.
   * Request Method: `POST`.
   * Custom Headers:
     ```http
     Content-Type: application/json
     X-Device-Token: tok_dev_YOUR_ACTUAL_DEVICE_TOKEN
     ```
   * Body Template:
     ```json
     {"from":"[from]","body":"[body]","sim_slot":[sim_slot],"timestamp":"[timestamp]"}
     ```
   * Tap **Save Channel**.
3. **Configure Forwarding Rule:**
   * Tap **Forwarding Rules** -> tap **+** (Add).
   * Type: **SMS**.
   * Sender Matches: `bKash;16216;Nagad;16222;Upay` (Case-Insensitive).
   * Target Channel: Select `DenaNeya Ingestion`.
   * SIM Slot: Select `ALL` (or choose specific SIM).
   * Tap **Save Rule**.
4. **(Optional) Configure Heartbeat Channel:**
   * Add a second Webhook channel pointing to `https://denaneya.aihaat.shop/api/device/heartbeat`.
   * Set timer interval to 15 minutes.

---

## 5. Step 3: OEM Battery Optimization & Background Execution

Android device manufacturers aggressively terminate background apps to conserve battery. **You must exempt the forwarder app from all battery savers.**

### Samsung (One UI)
1. Go to **Settings -> Apps -> MacroDroid** (or SMS Forwarder).
2. Tap **Battery** -> Select **"Unrestricted"**.
3. Go to **Settings -> Battery and device care -> Battery -> Background usage limits**.
4. Ensure **"Put unused apps to sleep"** is **Disabled**.
5. Tap **"Never sleeping apps"** -> tap **+** -> add **MacroDroid** (or SMS Forwarder).

### Xiaomi / Redmi / POCO (MIUI & HyperOS)
1. Go to **Settings -> Apps -> Manage apps -> MacroDroid** (or SMS Forwarder).
2. Enable **"Autostart"** (Allow app to start automatically).
3. Tap **Battery saver** -> Select **"No restrictions"**.
4. Enable **"Display pop-up windows while running in the background"**.
5. Open the Multitasking app switcher -> Long-press MacroDroid -> Tap the **Lock icon** 🔒.

### Vivo / iQOO (Funtouch OS / OriginOS)
1. Go to **Settings -> Battery -> Background power consumption management**.
2. Find MacroDroid / SMS Forwarder -> Select **"High background power consumption"**.
3. Go to **Settings -> Applications and Permissions -> Autostart** -> Enable MacroDroid.

### Oppo / Realme / OnePlus (ColorOS / Realme UI / OxygenOS)
1. Go to **Settings -> Battery -> More battery settings -> Optimize battery use**.
2. Find MacroDroid / SMS Forwarder -> Choose **"Don't optimize"**.
3. Go to **App management -> MacroDroid -> Battery usage** -> Enable **"Allow background activity"** and **"Allow auto-launch"**.

### Stock Android / Google Pixel
1. Go to **Settings -> Apps -> See all apps -> MacroDroid**.
2. Tap **App battery usage** -> Select **"Unrestricted"**.

---

## 6. Step 4: System Permissions Checklist

Verify that every one of the following permissions is granted:

- [x] **SMS Permission (`RECEIVE_SMS` & `READ_SMS`):** Allows forwarder to read incoming carrier receipts.
- [x] **Phone Permission (`READ_PHONE_STATE`):** Identifies which SIM slot received the funds (SIM 1 vs SIM 2).
- [x] **Network Permission (`INTERNET` & `ACCESS_NETWORK_STATE`):** Forwards receipts to the API.
- [x] **Ignore Battery Optimizations (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`):** Prevents Android OS from killing background listener.
- [x] **Notification Listener (Optional):** If using notification-based backup listeners.
- [x] **Locked in Recent Tasks:** Open multitasking screen and tap Lock 🔒 on the app thumbnail.

---

## 7. Step 5: End-to-End Verification Test Procedure

Before using the system in live production, perform this verification test:

### 1. Test Telemetry Heartbeat
* In MacroDroid, test the Heartbeat action, or wait 15 minutes.
* Check your Merchant Dashboard: The handset status indicator should change from `Offline` to `Online & Syncing` with green pulsing dot and battery level percentage.

### 2. Test Live Payment Reconciliation
1. In your dashboard or store, create a test invoice for **৳100.00**.
2. Open the checkout link (`/pay/:invoiceId`).
3. Send **৳100.00** from your personal bKash/Nagad account to the merchant SIM number on the handset.
4. When the carrier SMS arrives on the phone:
   * The forwarder triggers within 1 second.
   * MacroDroid posts to `/api/device/sync-sms` and receives `HTTP 201 Created`.
5. On the checkout page, enter the **TrxID** from your bKash/Nagad app or SMS.
6. The checkout page immediately updates to **"Payment Successful" (PAID)**, credits decrement by 1, and your store webhook triggers!

### 3. Test Negative / Anti-Fraud Defenses
* **Non-Carrier Sender Rejection:** If a friend sends an SMS from `01712345678` containing fake bKash text, the API returns `HTTP 400 UNAUTHORIZED_SENDER` and ignores it.
* **Debit / Cash-Out Rejection:** If you perform a cash-out or send money from the merchant phone, the API detects the debit keywords and returns `HTTP 400 DEBIT_TRANSACTION_REJECTED`.
* **Idempotency Deduplication:** If the same SMS is transmitted twice, the API returns `HTTP 200` with `duplicate: true`, preventing double-crediting.

---

## 8. 24/7 Production Reliability Runbook

### Handling Telecom SMS Delivery Delays
* During major festivals (Eid, Puja, New Year), telecommunication SMS queues in Bangladesh may experience 5–30 second latency.
* DenaNeya checkout pages include a **15-minute expiration window** and real-time short polling, comfortably accommodating carrier queue times.
* Advise customers: *"Please wait 15–30 seconds after sending funds before submitting your TrxID."*

### Keeping Merchant SIM Active
* Cellular operators deactivate SIM cards if no outbound paid activity occurs for 90 days.
* Set a recurring calendar reminder every 30 days to make a 10-second outbound call or send an outbound SMS from each SIM card.

### Handset Lost, Replaced, or Compromised
* If a physical handset is lost or damaged:
  1. Open Merchant Dashboard -> **Devices & SMS**.
  2. Locate the device and click **Rotate Token** (key icon).
  3. The compromised token is revoked in the database immediately; any incoming requests using it receive `HTTP 401`.
  4. Pair your replacement phone by scanning the newly generated QR code.

---

## 9. Quick Support & Diagnostics Matrix

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| **Handset shows "Offline"** | Phone went to sleep or app was purged by OEM | Re-verify Step 3 (Unrestricted Battery) and Lock app in recent tasks. |
| **HTTP 401 Unauthorized** | Token mismatch or rotated token | Check `X-Device-Token` header against active token in dashboard. |
| **HTTP 400 UNAUTHORIZED_SENDER** | Sender is not in BTRC whitelist | Ensure SMS came directly from official carrier mask (`bKash`, `16216`, `Nagad`, `16222`, `Upay`). |
| **HTTP 400 DEBIT_TRANSACTION_REJECTED** | Message was an outbound cash-out | DenaNeya only processes credit receipts (`Money Received`, `You have received`). |
| **HTTP 422 SMS_PARSE_FAILED** | Telco modified receipt format | Contact DenaNeya technical support with the exact SMS text. |
