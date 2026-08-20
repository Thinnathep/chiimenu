import sys
import requests
import json

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://qfvcevwskxfluscqclpq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ"

# Test phone login
for email_candidate in ["0962386554@phone.chiimenu.com", "0962386554"]:
    resp = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": email_candidate, "password": "PassWord"}
    )
    print(f"Login with {email_candidate}: Status {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        u_id = data["user"]["id"]
        token = data["access_token"]
        print("  User ID:", u_id)
        # Check stores owned by this user
        stores = requests.get(f"{SUPABASE_URL}/rest/v1/stores?owner_id=eq.{u_id}", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"}).json()
        print(f"  Stores owned by {email_candidate}: {len(stores)}")
        for s in stores:
            print(f"    * Store: {s['name']} (Slug: {s['slug']}, ID: {s['id']})")
    else:
        print("  Response:", resp.text)
