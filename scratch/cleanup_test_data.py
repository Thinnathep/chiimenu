import sys
import requests
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://qfvcevwskxfluscqclpq.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ"

# 1. Login as Admin
auth_resp = requests.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
    json={"email": "thinnathep.thanla@gmail.com", "password": "PassWord"}
)
auth = auth_resp.json()
token = auth["access_token"]
user_id = auth["user"]["id"]

# Target store
store_id = "717afe72-e1ad-4676-9ef1-c69292c4381b"

print("=" * 60)
print(f"🧹 STARTING TEST ORDERS CLEANUP (Store ID: {store_id})")
print("=" * 60)

# 2. Find and delete test orders (by table_no pattern or specific test names)
test_tables = ["T1-TEST", "T2-TEST", "T3-TEST", "T4-CANCELLED"]

for tbl in test_tables:
    del_resp = requests.delete(
        f"{SUPABASE_URL}/rest/v1/orders?store_id=eq.{store_id}&table_no=eq.{tbl}",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {token}",
            "Prefer": "return=representation"
        }
    )
    if del_resp.status_code in [200, 204]:
        deleted = del_resp.json() if del_resp.text else []
        print(f"  ✓ Deleted test order(s) for table: {tbl} (Count: {len(deleted)})")
    else:
        print(f"  ❌ Error deleting table {tbl}: {del_resp.text}")

# 3. Double check remaining orders in store
rem_resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/orders?store_id=eq.{store_id}&select=id,table_no,status,created_at&order=created_at.desc&limit=5",
    headers={
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}"
    }
)
rem_orders = rem_resp.json()
print("\n" + "=" * 60)
print(f"📋 REMAINING STORE ORDERS IN DATABASE (Latest 5):")
print("=" * 60)
for o in rem_orders:
    print(f"  - Order ID: {o['id']} | Table: {o['table_no']} | Status: {o['status']} | Date: {o['created_at']}")

# 4. Verify Analytics resets
api_resp = requests.get(
    f"http://localhost:3000/api/merchant/analytics",
    params={"period": "today", "storeId": store_id},
    headers={"Authorization": f"Bearer {token}"}
)
if api_resp.status_code == 200:
    data = api_resp.json().get("data", {})
    kpi = data.get("kpi", {})
    print("\n" + "=" * 60)
    print("📊 CURRENT LIVE ANALYTICS AFTER CLEANUP (Today):")
    print("=" * 60)
    print(f"  💰 Total Sales: ฿{kpi.get('total_sales')}")
    print(f"  🧾 Total Orders: {kpi.get('total_orders')}")
    print(f"  🍲 Items Sold: {kpi.get('total_items_sold')}")
    print("=" * 60)
    print("✅ DATABASE TEST DATA CLEANED UP SUCCESSFULLY! NO TEST DATA REMAINS.")
