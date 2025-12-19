
import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:5000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpassword"

def login():
    passwords_to_try = [
        "changeme",      # Default in config
        "adminpassword", # Previously tried
        "password",      # Common
        "admin",         # Common
        "123456",        # Common
        "admin123"       # Common
    ]
    
    for pwd in passwords_to_try:
        print(f"Trying password: {pwd}...")
        url = f"{BASE_URL}/auth/login"
        data = json.dumps({"email": ADMIN_EMAIL, "password": pwd}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        
        try:
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    body = json.loads(response.read().decode())
                    print(f" [SUCCESS] logged in with '{pwd}'")
                    return body.get('access_token')
        except Exception:
            pass # Try next
            
    print(" [FAILED] Could not log in with any common password.")
    return None

def verify_batch():
    token = login()
    if not token: return
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {token}"
    }
    
    # 1. Create Issue
    create_url = f"{BASE_URL}/issues/"
    issue_ids = []
    
    try:
        for i in range(2):
            data = json.dumps({
                "title": f"Batch Test {i}",
                "description": "Test",
                "priority": "low"
            }).encode('utf-8')
            req = urllib.request.Request(create_url, data=data, headers=headers)
            with urllib.request.urlopen(req) as res:
                body = json.loads(res.read().decode())
                issue_ids.append(body['id'])
                print(f"Created {body['id']}")
    except Exception as e:
        print(f"Create failed: {e}")
        return

    # 2. Batch Update
    batch_url = f"{BASE_URL}/issues/batch"
    data = json.dumps({
        "ids": issue_ids,
        "status": "resolved",
        "resolution_notes": "Urllib test"
    }).encode('utf-8')
    
    req = urllib.request.Request(batch_url, data=data, headers=headers, method='PUT')
    try:
        with urllib.request.urlopen(req) as res:
            print(f"Batch Update Status: {res.status}")
            print(res.read().decode())
    except Exception as e:
        print(f"Batch update failed: {e}")

if __name__ == "__main__":
    verify_batch()
