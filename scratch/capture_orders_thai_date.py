from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    
    # Login
    page.goto(f"{BASE_URL}/login")
    page.wait_for_selector("#loginId")
    page.fill("#loginId", "thinnathep.thanla@gmail.com")
    page.fill("#password", "PassWord")
    page.click("button[type='submit']")
    page.wait_for_timeout(3000)
    
    # Navigate to Orders
    page.goto(f"{BASE_URL}/merchant/orders")
    page.wait_for_timeout(3000)
    page.screenshot(path="scratch/orders_page_thai_date.png")
    print("Orders screenshot saved: scratch/orders_page_thai_date.png")
    browser.close()
