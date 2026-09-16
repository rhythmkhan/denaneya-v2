# -*- coding: utf-8 -*-
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\mdama\.gemini\antigravity\brain\c1a6925d-84ef-4c47-8570-b1bed299caec\.tempmediaStorage"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        
        # 1. Login
        print("Navigating to login...")
        page.goto("https://dashboard-tawny-gamma-28.vercel.app/login", wait_until="networkidle")
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)
        print("Logged in, currently on:", page.url)
        page.screenshot(path=f"{ARTIFACT_DIR}/live_nav_overview.png")

        # 2. Invoices
        print("Navigating to /invoices...")
        page.click('text="Invoices"')
        page.wait_for_timeout(1500)
        print("URL:", page.url)
        page.screenshot(path=f"{ARTIFACT_DIR}/live_nav_invoices.png")

        # 3. Gateways
        print("Navigating to /gateways...")
        page.click('text="Gateways (52+)"')
        page.wait_for_timeout(1500)
        print("URL:", page.url)
        page.screenshot(path=f"{ARTIFACT_DIR}/live_nav_gateways.png")

        # 4. Devices
        print("Navigating to /devices...")
        page.click('text="Devices & SMS"')
        page.wait_for_timeout(1500)
        print("URL:", page.url)
        page.screenshot(path=f"{ARTIFACT_DIR}/live_nav_devices.png")

        # 5. Landing Builder
        print("Navigating to /landing-builder...")
        page.click('text="Landing Builder"')
        page.wait_for_timeout(1500)
        print("URL:", page.url)
        page.screenshot(path=f"{ARTIFACT_DIR}/live_nav_landing_builder.png")

        browser.close()
        print("All pages tested successfully!")

if __name__ == "__main__":
    main()
