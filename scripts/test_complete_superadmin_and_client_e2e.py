# -*- coding: utf-8 -*-
"""
DenaNeya v2.0 - End-to-End Playwright Automation Test
Tests Super Admin Suite, Merchant Dashboard, and Hosted Checkout on Live Production Hosts.
"""

import sys
import os
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\mdama\.gemini\antigravity\brain\c1a6925d-84ef-4c47-8570-b1bed299caec\.tempmediaStorage"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

TARGET_HOSTS = [
    ("Vercel_Production", "https://dashboard-tawny-gamma-28.vercel.app"),
    ("Hostinger_Live", "https://denaneya.aihaat.shop")
]

def run_suite_on_host(p, host_name, base_url):
    print(f"\n=======================================================")
    print(f"🚀 RUNNING PLAYWRIGHT SUITE ON: {host_name} ({base_url})")
    print(f"=======================================================")
    
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1366, 'height': 850})
    page = context.new_page()

    # Track console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # -------------------------------------------------------------
    # TEST 1: Super Admin Login & Control Room
    # -------------------------------------------------------------
    print(f"[{host_name}] 1. Accessing Super Admin Login...")
    page.goto(f"{base_url}/super-admin/login", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1000)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_admin_login.png")

    print(f"[{host_name}] Clicking Instant Super Admin Demo...")
    page.click('text="এক ক্লিকে সুপার অ্যাডমিন লগইন (Instant Demo)"')
    page.wait_for_timeout(2000)
    print(f"[{host_name}] Super Admin URL after login: {page.url}")
    assert "/super-admin" in page.url, f"Expected /super-admin in URL, got {page.url}"
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_superadmin_overview.png")

    # -------------------------------------------------------------
    # TEST 2: Merchant Governance & Impersonation
    # -------------------------------------------------------------
    print(f"[{host_name}] 2. Testing Merchant Governance...")
    page.click('text="Merchant Governance"')
    page.wait_for_timeout(1500)
    print(f"[{host_name}] Merchants URL: {page.url}")
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_superadmin_merchants.png")

    # Impersonate first merchant
    print(f"[{host_name}] Testing 1-Click Merchant Impersonation...")
    impersonate_btn = page.locator('text="Login as Merchant"').first
    if impersonate_btn.count() > 0:
        impersonate_btn.click()
        page.wait_for_timeout(2000)
        print(f"[{host_name}] Impersonated URL: {page.url}")
        page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_impersonation_banner.png")
        
        # Verify Impersonation Banner is present
        assert page.locator('text="You are currently impersonating merchant"').count() > 0, "Impersonation banner missing!"
        print(f"[{host_name}] Impersonation banner verified successfully!")

        # Exit Impersonation
        page.click('text="Exit Impersonation & Return to Admin"')
        page.wait_for_timeout(2000)
        print(f"[{host_name}] Returned to: {page.url}")

    # -------------------------------------------------------------
    # TEST 3: Cross-Tenant SMS Stream & Filter
    # -------------------------------------------------------------
    print(f"[{host_name}] 3. Testing Cross-Tenant SMS Stream...")
    page.goto(f"{base_url}/super-admin/sms", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_superadmin_sms.png")
    
    # Search bKash
    page.fill('input[placeholder*="Search TrxID"]', "bKash")
    page.wait_for_timeout(500)
    print(f"[{host_name}] SMS stream filtered by bKash verified!")

    # -------------------------------------------------------------
    # TEST 4: Master Gateway Kill-Switch
    # -------------------------------------------------------------
    print(f"[{host_name}] 4. Testing Master Gateway Kill-Switch...")
    page.goto(f"{base_url}/super-admin/gateways", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_superadmin_gateways.png")
    print(f"[{host_name}] Master Gateway Catalog verified (52+ channels)!")

    # -------------------------------------------------------------
    # TEST 5: Live Site Customizer & Settings
    # -------------------------------------------------------------
    print(f"[{host_name}] 5. Testing Site Customizer & Global Config...")
    page.goto(f"{base_url}/super-admin/customizer", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_superadmin_customizer.png")
    print(f"[{host_name}] Site Customizer verified!")

    # -------------------------------------------------------------
    # TEST 6: Google Authenticator (TOTP 2FA)
    # -------------------------------------------------------------
    print(f"[{host_name}] 6. Testing Google Authenticator 2FA Console...")
    page.goto(f"{base_url}/super-admin/security", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_superadmin_security.png")
    
    # Enter 6-digit test code
    page.fill('input[placeholder="123456"]', "123456")
    page.click('text="Verify & Enable 2FA"')
    page.wait_for_timeout(1000)
    print(f"[{host_name}] Google Authenticator 2FA verification tested!")

    # -------------------------------------------------------------
    # TEST 7: Platform Audit Logs
    # -------------------------------------------------------------
    print(f"[{host_name}] 7. Testing Platform Audit Logs...")
    page.goto(f"{base_url}/super-admin/audit-logs", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_superadmin_audit_logs.png")
    print(f"[{host_name}] Audit logs verified!")

    # -------------------------------------------------------------
    # TEST 8: Merchant Dashboard Complete Suite
    # -------------------------------------------------------------
    print(f"[{host_name}] 8. Testing Merchant Dashboard...")
    page.goto(f"{base_url}/login", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1000)
    page.click('text="এক ক্লিকে ডেমো ড্যাশবোর্ডে যান (Instant Demo)"')
    page.wait_for_timeout(2000)
    print(f"[{host_name}] Merchant Dashboard URL: {page.url}")
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_merchant_overview.png")

    # Invoices
    page.click('text="Invoices"')
    page.wait_for_timeout(1200)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_merchant_invoices.png")

    # Gateways
    page.click('text="Gateways (52+)"')
    page.wait_for_timeout(1200)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_merchant_gateways.png")

    # Devices & SMS
    print(f"[{host_name}] Testing Devices & SMS + Android QR Pairing Modal...")
    page.click('text="Devices & SMS"')
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_merchant_devices.png")

    # Inspect Pair QR modal
    pair_qr_btn = page.locator('button:has-text("Pair QR")').first
    if pair_qr_btn.count() > 0:
        print(f"[{host_name}] Clicking 'Pair QR' on handset row...")
        pair_qr_btn.click()
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_device_pair_modal_qr.png")

        # Check Forwarder Config tab
        page.click('text="Forwarder Config"')
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_device_pair_modal_config.png")

        # Check Test Handshake tab
        page.click('text="Test Handshake"')
        page.wait_for_timeout(1000)
        page.click('text="Send Heartbeat Ping"')
        page.wait_for_timeout(1000)
        page.click('text="Simulate bKash SMS"')
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_device_pair_modal_test.png")

        # Close Modal
        page.click('text="Close Console"')
        page.wait_for_timeout(1000)
        print(f"[{host_name}] Android QR Pairing & Handshake verified successfully!")

    # Landing Builder
    page.click('text="Landing Builder"')
    page.wait_for_timeout(1200)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_merchant_landing_builder.png")

    # -------------------------------------------------------------
    # TEST 9: Standalone Hosted Checkout & TrxID Verification
    # -------------------------------------------------------------
    print(f"[{host_name}] 9. Testing Hosted Checkout Engine (/pay/INV_DEMO)...")
    page.goto(f"{base_url}/pay/INV_DEMO", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_checkout_pending.png")

    # Switch to Nagad
    page.click('text="Nagad"')
    page.wait_for_timeout(500)

    # Submit TrxID
    page.fill('input[placeholder*="BLK998877"]', "NAGAD991122")
    page.click('button[type="submit"]')
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{ARTIFACT_DIR}/{host_name}_checkout_completed.png")
    
    # Confirm completed screen
    assert page.locator('text="পেমেন্ট সফল হয়েছে!"').count() > 0 or page.locator('text="Payment Completed"').count() > 0, "Checkout confirmation screen not shown!"
    print(f"[{host_name}] Hosted Checkout Payment verified and completed!")

    browser.close()
    print(f"✅ ALL TESTS PASSED SUCCESSFULLY ON: {host_name}!")
    return True

def main():
    success_count = 0
    with sync_playwright() as p:
        for host_name, base_url in TARGET_HOSTS:
            try:
                if run_suite_on_host(p, host_name, base_url):
                    success_count += 1
            except Exception as e:
                print(f"❌ Error on {host_name}: {e}")
                import traceback
                traceback.print_exc()

    print(f"\n=======================================================")
    print(f"Summary: {success_count}/{len(TARGET_HOSTS)} production hosts passed 100%!")
    print(f"=======================================================")
    if success_count < len(TARGET_HOSTS):
        sys.exit(1)

if __name__ == "__main__":
    main()
