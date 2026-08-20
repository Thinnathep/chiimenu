import sys
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    
    page.goto("http://localhost:3000/login")
    page.wait_for_selector("#loginId")
    page.fill("#loginId", "thinnathep.thanla@gmail.com")
    page.fill("#password", "PassWord")
    page.click("button[type='submit']")
    page.wait_for_timeout(4000)
    
    page.goto("http://localhost:3000/merchant/orders")
    page.wait_for_timeout(3000)
    page.screenshot(path="scratch/orders_thai_date_live.png")
    print("Orders page captured successfully: scratch/orders_thai_date_live.png")
    browser.close()
