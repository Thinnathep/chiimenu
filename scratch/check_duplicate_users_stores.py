import sys
import requests
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://qfvcevwskxfluscqclpq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ"

# 1. Login with Admin email to get access token
auth_resp = requests.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
    json={"email": "thinnathep.thanla@gmail.com", "password": "PassWord"}
)
auth = auth_resp.json()
token = auth.get("access_token")
admin_user_id = auth.get("user", {}).get("id")

print("=" * 65)
print("🔍 INVESTIGATING USERS & STORES DUPLICATION")
print(f"Admin User ID: {admin_user_id} (Email: thinnathep.thanla@gmail.com)")
print("=" * 65)

headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"}

# 2. Check Profiles for email or phone
print("\n[1] Querying `profiles` table...")
prof_resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/profiles?select=id,email,phone,role,created_at",
    headers=headers
)
profiles = prof_resp.json() if prof_resp.status_code == 200 else []
print(f"Total profiles found: {len(profiles)}")

target_emails = ["thinnathep.thanla@gmail.com", "0962386554@phone.chiimenu.com"]
target_phones = ["0962386554", "+66962386554"]

matched_profile_ids = set()
for p in profiles:
    p_email = (p.get("email") or "").lower()
    p_phone = (p.get("phone") or "")
    if any(te in p_email for te in ["thinnathep", "0962386554"]) or any(tp in p_phone for tp in target_phones):
        matched_profile_ids.add(p["id"])
        print(f"  📌 Matched Profile: ID: {p['id']} | Email: {p.get('email')} | Phone: {p.get('phone')} | Role: {p.get('role')}")

if admin_user_id:
    matched_profile_ids.add(admin_user_id)

# 3. Check All Stores
print("\n[2] Querying `stores` table for all stores owned by target user/phone...")
stores_resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/stores?select=id,name,slug,owner_id,phone,is_active,plan_status,created_at,updated_at&order=created_at.desc",
    headers=headers
)
all_stores = stores_resp.json() if stores_resp.status_code == 200 else []
print(f"Total stores in system: {len(all_stores)}")

print("\n" + "=" * 65)
print("🏪 ALL STORES ASSOCIATED WITH thinnathep / 0962386554:")
print("=" * 65)

for s in all_stores:
    is_owner_match = s.get("owner_id") in matched_profile_ids
    is_phone_match = any(tp in str(s.get("phone") or "") for tp in target_phones)
    
    if is_owner_match or is_phone_match:
        print(f"\n🏬 ชื่อร้าน: {s.get('name')}")
        print(f"   - Store ID: {s.get('id')}")
        print(f"   - Slug URL: /m/{s.get('slug')}")
        print(f"   - Owner ID: {s.get('owner_id')} {'(Match Email)' if s.get('owner_id') == admin_user_id else '(Other ID)'}")
        print(f"   - เบอร์โทรในร้าน: {s.get('phone') or 'ไม่ได้ระบุ'}")
        print(f"   - สถานะร้าน (is_active): {s.get('is_active')}")
        print(f"   - แพ็กเกจ (plan_status): {s.get('plan_status')}")
        print(f"   - วันที่สร้าง: {s.get('created_at')}")

# Also print all other stores for complete visibility
print("\n" + "=" * 65)
print("📋 LIST OF ALL OTHER STORES IN DATABASE:")
print("=" * 65)
for s in all_stores:
    if s.get("owner_id") not in matched_profile_ids:
        print(f"  - {s.get('name')} (Slug: /m/{s.get('slug')}) | Owner: {s.get('owner_id')} | Phone: {s.get('phone')}")
