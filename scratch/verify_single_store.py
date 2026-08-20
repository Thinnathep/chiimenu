import sys
import requests
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://qfvcevwskxfluscqclpq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ"

auth = requests.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
    json={"email": "thinnathep.thanla@gmail.com", "password": "PassWord"}
).json()

token = auth["access_token"]
user_id = auth["user"]["id"]

stores = requests.get(
    f"{SUPABASE_URL}/rest/v1/stores?owner_id=eq.{user_id}&select=id,name,slug,plan_status,is_active",
    headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"}
).json()

print("=" * 60)
print("STORES OWNED BY thinnathep.thanla@gmail.com:")
print("=" * 60)
for s in stores:
    print(f" - Store: {s['name']} | Slug: /m/{s['slug']} | ID: {s['id']} | Plan: {s['plan_status']}")
print("Total stores owned:", len(stores))
print("=" * 60)
