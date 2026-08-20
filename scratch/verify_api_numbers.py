import sys
import requests
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3000"
SUPABASE_URL = "https://qfvcevwskxfluscqclpq.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ"

# 1. Login
auth_resp = requests.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
    json={"email": "thinnathep.thanla@gmail.com", "password": "PassWord"}
)
auth = auth_resp.json()
token = auth["access_token"]
user_id = auth["user"]["id"]

# 2. Target Store
store_id = "717afe72-e1ad-4676-9ef1-c69292c4381b"

print("=" * 60)
print(f"STORE ID: {store_id}")
print("=" * 60)

# 3. Call Analytics API
session = requests.Session()
# Set auth cookie for Nitro server
api_resp = requests.get(
    f"{BASE_URL}/api/merchant/analytics",
    params={"period": "today", "storeId": store_id},
    headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
    cookies={"sb-access-token": token, "sb-refresh-token": auth["refresh_token"]}
)

print(f"API HTTP Status: {api_resp.status_code}")
res_json = api_resp.json()
print("=" * 60)
print("📊 LIVE ANALYTICS DATA FROM API:")
print("=" * 60)
print(json.dumps(res_json, indent=2, ensure_ascii=False))

kpi = res_json.get("data", {}).get("kpi", {})
status_sum = res_json.get("data", {}).get("order_status", {})

print("\n" + "=" * 60)
print("🎯 EXACT VERIFICATION CHECKLIST:")
print("=" * 60)
print(f"  💰 Total Sales (ยอดขายรวม): ฿{kpi.get('total_sales')}  --> {'[CORRECT: 600฿]' if kpi.get('total_sales') == 600 else '[WRONG]'}")
print(f"  🧾 Total Orders (จำนวนออเดอร์): {kpi.get('total_orders')} ออเดอร์ --> {'[CORRECT: 3 Orders]' if kpi.get('total_orders') == 3 else '[WRONG]'}")
print(f"  🎯 AOV (เฉลี่ยต่อออเดอร์): ฿{kpi.get('avg_order_value')} --> {'[CORRECT: 200฿]' if kpi.get('avg_order_value') == 200 else '[WRONG]'}")
print(f"  ❌ Cancelled Orders (ยกเลิก): {status_sum.get('cancelled_orders')} --> {'[CORRECT: 1 Order]' if status_sum.get('cancelled_orders') == 1 else '[WRONG]'}")
print(f"  📑 Total Placed Orders: {status_sum.get('total_orders')} --> {'[CORRECT: 4 Orders]' if status_sum.get('total_orders') == 4 else '[WRONG]'}")
print("=" * 60)
