import sys
import os
import json
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"
ADMIN_EMAIL = "thinnathep.thanla@gmail.com"
ADMIN_PASSWORD = "PassWord"

def verify_ui_and_calculations():
    print("=" * 65)
    print("🎯 STARTING COMPLETE E2E HEADLESS TEST: SALES & ORDER CALCULATION")
    print(f"URL: {BASE_URL}")
    print(f"User: {ADMIN_EMAIL}")
    print("=" * 65)

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Login
        print("\n[STEP 1] Logging in via Web Interface...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.fill("#loginId", ADMIN_EMAIL)
        page.fill("#password", ADMIN_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)
        page.wait_for_load_state("networkidle")
        print(f"  ✓ Logged in! Current URL: {page.url}")

        # 2. Go to Analytics
        print("\n[STEP 2] Navigating to /merchant/analytics...")
        page.goto(f"{BASE_URL}/merchant/analytics")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

        # 3. Verify 4 KPI Cards
        print("\n[STEP 3] Verifying KPI Values in DOM...")
        kpi_cards = page.locator(".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div")
        
        card1_text = kpi_cards.nth(0).inner_text().replace('\n', ' | ')
        card2_text = kpi_cards.nth(1).inner_text().replace('\n', ' | ')
        card3_text = kpi_cards.nth(2).inner_text().replace('\n', ' | ')
        card4_text = kpi_cards.nth(3).inner_text().replace('\n', ' | ')

        print(f"  -> KPI 1 (Sales): {card1_text}")
        print(f"  -> KPI 2 (Orders): {card2_text}")
        print(f"  -> KPI 3 (Items Sold): {card3_text}")
        print(f"  -> KPI 4 (AOV): {card4_text}")

        # Assertions
        # 1. Sales: 600฿ (NOT 700฿)
        has_600 = "600" in card1_text
        no_700 = "700" not in card1_text
        sales_ok = has_600 and no_700
        results.append(("1. Total Sales = 600฿ (Excluded Cancelled 100฿)", sales_ok, f"Card Text: {card1_text}"))

        # 2. Orders: 3 (NOT 4)
        orders_ok = "3" in card2_text
        results.append(("2. Total Orders = 3 Orders (Excluded Cancelled 1 Order)", orders_ok, f"Card Text: {card2_text}"))

        # 3. Items Sold: 3
        items_ok = "3" in card3_text
        results.append(("3. Total Items Sold = 3 Items", items_ok, f"Card Text: {card3_text}"))

        # 4. AOV: 200฿
        aov_ok = "200" in card4_text
        results.append(("4. Average Order Value (AOV) = 200฿", aov_ok, f"Card Text: {card4_text}"))

        # 5. Top 10 Selling Menu Ranking
        print("\n[STEP 4] Verifying Top Selling Menu Table...")
        has_sea_bass = page.locator("text=ปลากะพงทอดน้ำปลา").count() > 0
        has_tom_yum = page.locator("text=ต้มยำกุ้งน้ำข้น").count() > 0
        has_chicken_rice = page.locator("text=ข้าวมันไก่พิเศษ").count() > 0
        no_lemon_tea = page.locator("text=ชามะนาวเย็น").count() == 0

        top_menu_ok = has_sea_bass and has_tom_yum and has_chicken_rice and no_lemon_tea
        results.append(("5. Top Menu Ranking (Ranked by Sales & Cancelled Item Excluded)", top_menu_ok, f"Sea Bass: {has_sea_bass}, Tom Yum: {has_tom_yum}, Chicken Rice: {has_chicken_rice}, Cancelled Excluded: {no_lemon_tea}"))

        # 6. Order Status Summary
        print("\n[STEP 5] Verifying Order Status Summary Breakdown...")
        has_cancelled_badge = page.locator("text=ออเดอร์ที่ยกเลิก").count() > 0
        results.append(("6. Order Status Summary (Tracks Cancelled Separately)", has_cancelled_badge, "Cancelled orders tracked in status breakdown"))

        # 7. Take Screenshot
        os.makedirs("scratch", exist_ok=True)
        screenshot_path = "scratch/merchant_analytics_live_verified.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n[STEP 6] Saved Verification Screenshot: {screenshot_path}")
        results.append(("7. Visual Screenshot Captured", True, screenshot_path))

        browser.close()

    print("\n" + "=" * 65)
    print("📊 FINAL VERIFICATION RESULTS SUMMARY")
    print("=" * 65)
    all_passed = True
    for name, passed, details in results:
        status_tag = "✅ PASS" if passed else "❌ FAIL"
        if not passed:
            all_passed = False
        print(f"{status_tag} | {name}\n       └─ {details}")
    print("=" * 65)
    print(f"Overall Result: {'🎉 100% PERFECT — ALL CALCULATIONS & BUSINESS RULES PASSED' if all_passed else '❌ SOME TESTS FAILED'}\n")
    return all_passed

if __name__ == "__main__":
    success = verify_ui_and_calculations()
    sys.exit(0 if success else 1)
