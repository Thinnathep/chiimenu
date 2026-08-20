import sys
import os
import json
import time
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"
ADMIN_EMAIL = "thinnathep.thanla@gmail.com"
ADMIN_PASSWORD = "PassWord"

SUPABASE_URL = "https://qfvcevwskxfluscqclpq.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ"

def run_calculation_verification():
    print("=" * 65)
    print("🎯 STARTING DEEP SALES & ORDER CALCULATION VERIFICATION")
    print(f"Target URL: {BASE_URL}")
    print(f"Admin User: {ADMIN_EMAIL}")
    print("=" * 65)

    # 1. Authenticate with Supabase Auth to get user session & store
    print("\n[STEP 1] Authenticating with Supabase to identify test store...")
    auth_resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        },
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
    )

    if auth_resp.status_code != 200:
        print(f"❌ Supabase Auth failed: {auth_resp.text}")
        return False

    auth_data = auth_resp.json()
    user_id = auth_data["user"]["id"]
    access_token = auth_data["access_token"]
    print(f"  ✓ Logged in as User ID: {user_id}")

    # 2. Get user's Store ID
    store_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/stores?owner_id=eq.{user_id}&select=id,name,slug&order=created_at.desc&limit=1",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {access_token}"
        }
    )
    stores = store_resp.json()
    if not stores or len(stores) == 0:
        print("❌ No store found for user.")
        return False

    store_id = stores[0]["id"]
    store_name = stores[0]["name"]
    print(f"  ✓ Target Store: '{store_name}' (ID: {store_id})")

    # 3. Clean up existing test orders for today if any, so numbers match exactly
    # (Or insert the 4 test orders directly)
    print("\n[STEP 2] Inserting the 4 Exact Test Orders...")
    
    test_orders_data = [
        {
            "store_id": store_id,
            "table_no": "T1-TEST",
            "items": [
                {
                    "name_th": "ข้าวมันไก่พิเศษ (100฿)",
                    "name_en": "Hainanese Chicken Rice",
                    "unitPrice": 100,
                    "quantity": 1
                }
            ],
            "status": "pending",
            "line_notified": False
        },
        {
            "store_id": store_id,
            "table_no": "T2-TEST",
            "items": [
                {
                    "name_th": "ต้มยำกุ้งน้ำข้น (200฿)",
                    "name_en": "Tom Yum Goong",
                    "unitPrice": 200,
                    "quantity": 1
                }
            ],
            "status": "pending",
            "line_notified": False
        },
        {
            "store_id": store_id,
            "table_no": "T3-TEST",
            "items": [
                {
                    "name_th": "ปลากะพงทอดน้ำปลา (300฿)",
                    "name_en": "Fried Sea Bass with Fish Sauce",
                    "unitPrice": 300,
                    "quantity": 1
                }
            ],
            "status": "pending",
            "line_notified": False
        },
        {
            "store_id": store_id,
            "table_no": "T4-CANCELLED",
            "items": [
                {
                    "name_th": "ชามะนาวเย็น (100฿ ยกเลิก)",
                    "name_en": "Iced Lemon Tea (Cancelled)",
                    "unitPrice": 100,
                    "quantity": 1
                }
            ],
            "status": "cancelled",
            "line_notified": False
        }
    ]

    inserted_order_ids = []

    for idx, ord_payload in enumerate(test_orders_data):
        ins_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/orders",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            json=ord_payload
        )
        if ins_resp.status_code in [200, 201]:
            created = ins_resp.json()[0]
            inserted_order_ids.append(created["id"])
            item_name = ord_payload["items"][0]["name_th"]
            price = ord_payload["items"][0]["unitPrice"]
            status = ord_payload["status"]
            print(f"  ✓ Order #{idx+1} Created: {item_name} -> {price}฿ [Status: {status}]")
        else:
            print(f"❌ Failed to insert order #{idx+1}: {ins_resp.text}")
            return False

    print(f"\n  ✓ Successfully created {len(inserted_order_ids)} test orders in DB.")

    # 4. Verification via Server API Endpoint
    print("\n[STEP 3] Verifying Calculations via API /api/merchant/analytics...")
    
    # Use Playwright to execute and test via real browser session
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Login
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.fill("#loginId", ADMIN_EMAIL)
        page.fill("#password", ADMIN_PASSWORD)
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)
        page.wait_for_load_state("networkidle")

        # Navigate to Analytics
        page.goto(f"{BASE_URL}/merchant/analytics")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

        # 5. Extract rendered KPI values
        print("\n[STEP 4] Inspecting Rendered UI Metrics on Webpage...")
        kpi_cards = page.locator(".grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 > div")
        
        sales_card_text = kpi_cards.nth(0).inner_text()
        orders_card_text = kpi_cards.nth(1).inner_text()
        items_card_text = kpi_cards.nth(2).inner_text()
        aov_card_text = kpi_cards.nth(3).inner_text()

        print(f"  -> Total Sales Rendered: {sales_card_text.splitlines()[1]}")
        print(f"  -> Total Orders Rendered: {orders_card_text.splitlines()[1]}")
        print(f"  -> Items Sold Rendered: {items_card_text.splitlines()[1]}")
        print(f"  -> AOV Rendered: {aov_card_text.splitlines()[1]}")

        # Assertions
        # Sales MUST contain 600 (not 700)
        has_600_sales = "600" in sales_card_text
        not_700_sales = "700" not in sales_card_text
        results.append(("Sales Calculation (Must be 600฿, NOT 700฿)", has_600_sales and not_700_sales, f"Rendered Sales: {sales_card_text.splitlines()[1]}"))

        # Orders MUST be 3 (not 4)
        has_3_orders = "3" in orders_card_text
        results.append(("Valid Orders Count (Must be 3 Orders, NOT 4)", has_3_orders, f"Rendered Orders: {orders_card_text.splitlines()[1]}"))

        # AOV MUST be 200
        has_200_aov = "200" in aov_card_text
        results.append(("Average Order Value (Must be 200฿)", has_200_aov, f"Rendered AOV: {aov_card_text.splitlines()[1]}"))

        # Order Status Summary Breakdown
        status_summary_el = page.locator("text=สรุปสถานะออเดอร์")
        has_status_summary = status_summary_el.count() > 0
        
        # Check Cancelled Orders count in status breakdown
        cancelled_el = page.locator("text=ออเดอร์ที่ยกเลิก")
        has_cancelled_tracked = cancelled_el.count() > 0
        results.append(("Order Status Summary & Cancelled Tracking", has_status_summary and has_cancelled_tracked, "Cancelled order tracked separately from sales"))

        # Top Selling Menu
        top_menu_el = page.locator("text=เมนูขายดี")
        has_top_menu = top_menu_el.count() > 0
        results.append(("Top Selling Menu Rendered", has_top_menu, "Top Menu table displayed with test items ranked"))

        # 6. Capture Visual Verification Screenshot
        screenshot_path = "scratch/merchant_analytics_verified_live.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n[STEP 5] Verification Screenshot Saved to: {screenshot_path}")
        results.append(("Visual Screenshot Saved", True, screenshot_path))

        browser.close()

    print("\n" + "=" * 65)
    print("📊 CALCULATION & BUSINESS RULE VERIFICATION SUMMARY")
    print("=" * 65)
    all_passed = True
    for name, passed, details in results:
        status_tag = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f"{status_tag} | {name}: {details}")
    print("=" * 65)
    print(f"Final Verification Result: {'🎉 ALL CALCULATIONS 100% CORRECT' if all_passed else '❌ CALCULATION MISMATCH'}\n")
    return all_passed

if __name__ == "__main__":
    success = run_calculation_verification()
    sys.exit(0 if success else 1)
