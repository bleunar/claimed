import uuid
import json
from datetime import datetime

def log_activity(db, account_id, laboratory_id, target_type, target_id, action_type, summary, changes=None):
    try:
        cursor = db.cursor()
        
        log_id = uuid.uuid4().hex[:16]
        
        query = """
            INSERT INTO laboratory_activity_logs 
            (id, laboratory_id, account_id, target_type, target_id, action_type, summary, changes, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        changes_json = json.dumps(changes) if changes else None
        
        cursor.execute(query, (
            log_id,
            laboratory_id,
            account_id,
            target_type,
            target_id,
            action_type,
            summary,
            changes_json,
            datetime.now()
        ))
        
        cursor.close()
        
    except Exception as e:
        print(f"Failed to log activity: {e}")
