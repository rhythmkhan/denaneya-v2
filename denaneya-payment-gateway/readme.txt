=== DenaNeya Payment Gateway for WooCommerce ===
Contributors: denaneyateam
Tags: payment gateway, bkash, nagad, rocket, upay, mfs, bangladesh, woocommerce
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Accept direct-to-SIM MFS payments (bKash, Nagad, Rocket, Upay) with 0% gateway commission and automated SMS verification via DenaNeya v2.0.

== Description ==

The **DenaNeya Payment Gateway for WooCommerce** connects your online store directly to your personal or agent Mobile Financial Services (MFS) SIM accounts in Bangladesh. 

Unlike traditional aggregator gateways that charge 2% - 3.5% transaction fees and withhold settlements for 3-7 business days, DenaNeya offers:
* **0% Gateway Commission**: Customer payments land directly on your SIM with zero deduction.
* **Instant Cash Flow**: No escrow or delayed payouts.
* **Automated SMS Verification**: Physical Android handset captures carrier SMS and verifies transactions via Atomic Compare-And-Swap (CAS).
* **Cryptographic Webhook Security**: Fully signed HMAC-SHA256 callbacks with RFC 8785 JSON canonicalization, replay mitigation, and 300s freshness window.
* **WooCommerce HPOS Compatible**: 100% compliant with High-Performance Order Storage (custom order tables).

== Installation ==

1. Upload `denaneya-payment-gateway.zip` via WordPress Admin -> Plugins -> Add New -> Upload Plugin.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Navigate to **WooCommerce -> Settings -> Payments -> DenaNeya**.
4. Configure your **API Base URL**, **Brand API Key**, **Brand API Secret**, and **Webhook Secret**.
5. Copy the generated Webhook Callback URL and paste it into your DenaNeya Merchant Dashboard.
6. Save changes and start accepting automated zero-fee MFS payments!

== Frequently Asked Questions ==

= Which payment channels are supported? =
All major Bangladeshi MFS channels including bKash, Nagad, Rocket, Upay, Islamic Wallet, and bank transfers.

= Is High-Performance Order Storage (HPOS) supported? =
Yes, DenaNeya Payment Gateway fully supports WooCommerce HPOS with custom order tables.

= What PHP version is required? =
PHP 7.4 or higher (PHP 8.0, 8.1, 8.2, and 8.3+ supported).

== Changelog ==

= 2.0.0 =
* Initial release of DenaNeya v2.0 payment automation gateway for WooCommerce.
* Added pure PHP RFC 8785 JSON Canonicalization Scheme.
* Added HMAC-SHA256 signature verification with replay protection and nonce caching.
* Full HPOS (High-Performance Order Storage) support.
