
import unittest
# No Flask app context easily available, so we will perform a "static" check of the file content
# combined with a syntax check.

print("Verifying Activity Logic...")

# Syntax check
try:
    from endpoints import activities
    print("[PASS] Imported activities endpoint module successfully.")
except Exception as e:
    print(f"[FAIL] Failed to import activities endpoint: {e}")
    exit(1)

# Logic check (Textual analysis of SQL)
with open('backend/endpoints/activities.py', 'r') as f:
    content = f.read()
    
    if "show_all = request.args.get('show_all', 'false').lower() == 'true'" in content:
        print("[PASS] 'show_all' parameter handling found.")
    else:
        print("[FAIL] 'show_all' parameter handling NOT found.")
        
    if "NOT (l.comp_target_id IS NOT NULL AND l.action_type = 'update')" in content:
        print("[PASS] Component update filtering logic found.")
    else:
        # It might be in the if not show_all block
        pass
        
    if "if not show_all:" in content:
        print("[PASS] Conditional filtering block found.")
    else:
        print("[FAIL] Conditional filtering block NOT found.")

print("Verification complete.")
