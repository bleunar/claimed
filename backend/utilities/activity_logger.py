import uuid
import json
from datetime import datetime

def log_activity(db, account_id, laboratory_id, target_type, target_id, action_type, summary, changes=None):
    try:
        cursor = db.cursor(dictionary=True)
        
        log_id = uuid.uuid4().hex[:16]
        
        # Map target_type/id to specific columns
        lab_target_id = None
        set_target_id = None
        comp_target_id = None
        
        # Snapshot Data Collection
        snapshot = {
            "account": {"id": account_id, "name": "Unknown"},
            "target": {}
        }

        # 1. Fetch Account Info
        try:
            cursor.execute("SELECT first_name, last_name, role FROM accounts WHERE id = %s", (account_id,))
            account = cursor.fetchone()
            if account:
                snapshot['account'] = {
                    "id": account_id,
                    "name": f"{account['first_name']} {account['last_name']}",
                    "role": account['role']
                }
        except Exception as e:
            print(f"Error fetching account snapshot: {e}")

        # 2. Fetch Target Info based on type
        # laboratory_id is passed for context, but might also be the target
        if target_type == 'laboratory':
            lab_target_id = target_id
            try:
                cursor.execute("SELECT name FROM laboratories WHERE id = %s", (target_id,))
                lab = cursor.fetchone()
                if lab:
                    snapshot['target']['laboratory'] = {"id": target_id, "name": lab['name']}
            except Exception:
                pass

        elif target_type == 'computer_set':
            set_target_id = target_id
            lab_target_id = laboratory_id 
            try:
                cursor.execute("""
                    SELECT cs.set_name, l.name as lab_name, l.id as lab_id 
                    FROM computer_sets cs 
                    LEFT JOIN laboratories l ON cs.laboratory_id = l.id 
                    WHERE cs.id = %s
                """, (target_id,))
                cset = cursor.fetchone()
                if cset:
                    snapshot['target']['computer_set'] = {"id": target_id, "name": cset['set_name']}
                    # Capture lab if implicated
                    if cset['lab_id']:
                         snapshot['target']['laboratory'] = {"id": cset['lab_id'], "name": cset['lab_name']}
            except Exception:
                pass
            
        elif target_type == 'component':
             comp_target_id = target_id
             lab_target_id = laboratory_id
             try:
                cursor.execute("""
                    SELECT c.brand_name, c.component_type, cs.set_name, cs.id as set_id, l.name as lab_name, l.id as lab_id
                    FROM computer_set_components c
                    LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id
                    LEFT JOIN laboratories l ON cs.laboratory_id = l.id
                    WHERE c.id = %s
                """, (target_id,))
                comp = cursor.fetchone()
                if comp:
                    snapshot['target']['component'] = {
                        "id": target_id, 
                        "brand_name": comp['brand_name'], 
                        "type": comp['component_type']
                    }
                    if comp['set_id']:
                        snapshot['target']['computer_set'] = {"id": comp['set_id'], "name": comp['set_name']}
                    if comp['lab_id']:
                        snapshot['target']['laboratory'] = {"id": comp['lab_id'], "name": comp['lab_name']}
             except Exception:
                 pass

        # If strict mapping is preferred:
        if target_type == 'laboratory' and not lab_target_id:
            lab_target_id = target_id
            
        query = """
            INSERT INTO laboratory_activity 
            (id, account_id, lab_target_id, set_target_id, comp_target_id, action_type, summary, metadata, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        # Merge Snapshot with Changes
        metadata_payload = {
            "snapshot": snapshot,
            "changes": changes if changes else {}
        }
        
        metadata_json = json.dumps(metadata_payload)
        
        cursor.execute(query, (
            log_id,
            account_id,
            lab_target_id,
            set_target_id,
            comp_target_id,
            action_type,
            summary,
            metadata_json,
            datetime.now()
        ))
        
        # Assume caller commits
        cursor.close()
        
    except Exception as e:
        print(f"Failed to log activity: {e}")
