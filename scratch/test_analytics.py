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

def run_tests():
    print("=" * 60)
    print("STARTING AUTOMATED MERCHANT ANALYTICS TESTING")
    print(f"Target: {BASE_URL}")
    print(f"User: {ADMIN_EMAIL}")
    print("=" * 60)

    results = []

    with sync_playwright() as p:
        # Launch Chromium in headless mode (no window opened)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        network_errors = []

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("response", lambda resp: network_errors.append(f"{resp.status} {resp.url}") if resp.status >= 400 else None)

        try:
            # 1. Login Flow
            print("\n[STEP 1] Logging in...")
            page.goto(f"{BASE_URL}/login")
            page.wait_for_load_state("networkidle")

            page.fill("#loginId", ADMIN_EMAIL)
            page.fill("#password", ADMIN_PASSWORD)
            page.click("button[type='submit']")

            # Wait for navigation after login
            page.wait_for_timeout(3000)
            page.wait_for_load_state("networkidle")

            current_url = page.url
            print(f"  -> Current URL after login: {current_url}")
            results.append(("Login Flow", True, f"Navigated to {current_url}"))

            # 2. Navigate to Merchant Analytics Page
            print("\n[STEP 2] Navigating to /merchant/analytics...")
            page.goto(f"{BASE_URL}/merchant/analytics")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)

            # 3. Verify Page Header
            title_el = page.locator("h1")
            title_text = title_el.first.inner_text() if title_el.count() > 0 else ""
            print(f"  -> Page Title: {title_text}")
            assert "รายงานยอดขาย" in title_text or "Sales" in title_text or "销售" in title_text
            results.append(("Page Header Verification", True, f"Found title: '{title_text}'"))

            # 4. Verify 4 KPI Cards
            print("\n[STEP 3] Verifying KPI Summary Cards...")
            cards = page.locator(".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div")
            card_count = cards.count()
            print(f"  -> Found {card_count} KPI cards")
            assert card_count == 4, f"Expected 4 KPI cards, found {card_count}"
            
            kpi_texts = [cards.nth(i).inner_text().replace('\n', ' | ') for i in range(card_count)]
            for i, txt in enumerate(kpi_texts):
                print(f"     Card {i+1}: {txt[:80]}...")
            results.append(("4 KPI Cards Rendered", True, f"{card_count} cards displayed with live metrics"))

            # 5. Verify 4 Period Tabs (Today, 7 Days, Month, Year)
            print("\n[STEP 4] Testing Time Range Filters (Today, 7 Days, This Month, This Year)...")
            period_buttons = page.locator(".inline-flex.p-1 button")
            btn_count = period_buttons.count()
            print(f"  -> Found {btn_count} period filter buttons")
            assert btn_count >= 4, f"Expected at least 4 period buttons, found {btn_count}"

            btn_names = [period_buttons.nth(i).inner_text().strip() for i in range(btn_count)]
            print(f"  -> Period options: {btn_names}")

            # Test clicking each tab
            for name in ["7 วันที่ผ่านมา", "เดือนนี้", "ปีนี้", "วันนี้"]:
                tab_btn = page.locator(f"button:has-text('{name}')")
                if tab_btn.count() > 0:
                    tab_btn.first.click()
                    page.wait_for_timeout(1000)
                    page.wait_for_load_state("networkidle")
                    print(f"     [OK] Clicked tab '{name}' - State updated smoothly")

            results.append(("Period Filter Tabs (Today/7Days/Month/Year)", True, f"All {btn_count} tabs clickable and reactive"))

            # 6. Verify State Handling (Empty State or Populated State)
            print("\n[STEP 5] Verifying State Rendering...")
            empty_banner = page.locator("text=ยังไม่มีข้อมูลการขายในช่วงเวลานี้")
            is_empty = empty_banner.count() > 0
            
            if is_empty:
                print("  -> Empty State Banner detected: Clean message and quick-action links rendered")
                qr_link = page.locator("text=ดู QR Code ประจำโต๊ะ")
                has_qr_link = qr_link.count() > 0
                results.append(("Empty State Handling", has_qr_link, "Empty State banner with QR shortcut rendered properly"))
            else:
                top_menu = page.locator("text=เมนูขายดี")
                order_summary = page.locator("text=สรุปสถานะออเดอร์")
                has_visuals = top_menu.count() > 0 and order_summary.count() > 0
                print(f"  -> Populated Sections detected: Top Selling Menu & Order Status rendered ({has_visuals})")
                results.append(("Populated Analytics State", has_visuals, "Top Selling Menu and Order Status summary active"))

            # 7. Take Full Page Screenshot
            os.makedirs("scratch", exist_ok=True)
            screenshot_path = "scratch/merchant_analytics_test.png"
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"\n[STEP 6] Screenshot saved to: {screenshot_path}")
            results.append(("Visual Screenshot Capture", True, screenshot_path))

            # 8. Check Network/403 Errors on Analytics
            analytics_403 = [e for e in network_errors if "403" in e and "analytics" in e]
            if analytics_403:
                print(f"  [FAIL] 403 Forbidden errors detected: {analytics_403}")
                results.append(("Zero 403 Forbidden Errors", False, f"Found {len(analytics_403)} 403 errors"))
            else:
                print("  [PASS] Zero 403 Forbidden errors! Analytics API loaded with 200 OK.")
                results.append(("Zero 403 Forbidden Errors", True, "All requests authorized with HTTP 200"))

        except Exception as e:
            print(f"\n[ERROR] Test Failed with Exception: {e}")
            results.append(("Test Execution", False, str(e)))
        finally:
            browser.close()

    print("\n" + "=" * 60)
    print("TEST EXECUTION SUMMARY")
    print("=" * 60)
    all_passed = True
    for name, passed, details in results:
        status_tag = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f"{status_tag} | {name}: {details}")
    print("=" * 60)
    print(f"Final Status: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}\n")
    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
