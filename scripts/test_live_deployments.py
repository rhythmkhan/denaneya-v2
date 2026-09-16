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
        
        # 1. Test Web
        print("=== Testing Landing Web: https://web-eight-lilac-96.vercel.app ===")
        page_web = browser.new_page(viewport={'width': 1280, 'height': 800})
        page_web.on('console', lambda m: print('WEB CONSOLE:', m.text))
        page_web.on('pageerror', lambda e: print('WEB ERROR:', e))
        
        resp_web = page_web.goto("https://web-eight-lilac-96.vercel.app", wait_until="networkidle")
        print(f"Web HTTP Status: {resp_web.status if resp_web else 'None'}")
        print(f"Web URL: {page_web.url}")
        print(f"Web Title: {page_web.title()}")
        page_web.screenshot(path=f"{ARTIFACT_DIR}/live_check_web.png")
        
        # Check nav links on web
        links = page_web.locator('a').all()
        print(f"Found {len(links)} links on web.")
        for link in links[:10]:
            href = link.get_attribute('href')
            text = link.inner_text().strip()
            if text or href:
                print(f"  Link: '{text}' -> {href}")

        # 2. Test Dashboard
        print("\n=== Testing Dashboard: https://dashboard-tawny-gamma-28.vercel.app ===")
        page_dash = browser.new_page(viewport={'width': 1280, 'height': 800})
        page_dash.on('console', lambda m: print('DASH CONSOLE:', m.text))
        page_dash.on('pageerror', lambda e: print('DASH ERROR:', e))
        
        resp_dash = page_dash.goto("https://dashboard-tawny-gamma-28.vercel.app", wait_until="networkidle")
        print(f"Dash HTTP Status: {resp_dash.status if resp_dash else 'None'}")
        print(f"Dash URL: {page_dash.url}")
        print(f"Dash Title: {page_dash.title()}")
        page_dash.screenshot(path=f"{ARTIFACT_DIR}/live_check_dash.png")

        # Try submitting login
        email_inp = page_dash.locator('input[type="email"]')
        if email_inp.count() > 0:
            print("Login form detected on Dashboard. Filling credentials...")
            email_inp.fill("demo@denaneya.com")
            page_dash.locator('input[type="password"]').fill("Secret123!")
            page_dash.click('button[type="submit"]')
            page_dash.wait_for_timeout(3000)
            print(f"After submit URL: {page_dash.url}")
            
            alerts = page_dash.locator('.text-rose-700, .bg-rose-50').all()
            for al in alerts:
                print(f"Dashboard Alert message: {al.inner_text()}")
                
            page_dash.screenshot(path=f"{ARTIFACT_DIR}/live_check_dash_after_login.png")

        # 3. Test Hostinger
        print("\n=== Testing Hostinger: http://denaneya.aihaat.shop ===")
        page_host = browser.new_page(viewport={'width': 1280, 'height': 800})
        page_host.on('console', lambda m: print('HOST CONSOLE:', m.text))
        page_host.on('pageerror', lambda e: print('HOST ERROR:', e))
        try:
            resp_host = page_host.goto("http://denaneya.aihaat.shop", wait_until="networkidle", timeout=10000)
            print(f"Hostinger HTTP Status: {resp_host.status if resp_host else 'None'}")
            print(f"Hostinger URL: {page_host.url}")
            page_host.screenshot(path=f"{ARTIFACT_DIR}/live_check_hostinger.png")
        except Exception as ex:
            print(f"Hostinger load error: {ex}")

        browser.close()

if __name__ == "__main__":
    main()
