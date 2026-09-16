import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.on('console', lambda m: print('CONSOLE:', m.type, m.text))
    page.on('pageerror', lambda e: print('PAGEERROR:', e))
    resp = page.goto('https://denaneya.aihaat.shop/login', wait_until='networkidle')
    print('Initial Status:', resp.status if resp else 'None')
    print('Initial URL:', page.url)
    page.screenshot(path=r'C:\Users\mdama\.gemini\antigravity\brain\c1a6925d-84ef-4c47-8570-b1bed299caec\.tempmediaStorage\hostinger_before.png')
    
    # Try clicking submit
    btn = page.locator('button[type="submit"]')
    print('Submit button count:', btn.count())
    if btn.count() > 0:
        page.locator('input[type="email"]').fill('demo@denaneya.com')
        page.locator('input[type="password"]').fill('Secret123!')
        btn.click()
        page.wait_for_timeout(3000)
        print('After click URL:', page.url)
        page.screenshot(path=r'C:\Users\mdama\.gemini\antigravity\brain\c1a6925d-84ef-4c47-8570-b1bed299caec\.tempmediaStorage\hostinger_after.png')
    
    alerts = page.locator('.text-rose-700, .bg-rose-50').all()
    for al in alerts:
        print('Alert text:', al.inner_text())

    browser.close()
