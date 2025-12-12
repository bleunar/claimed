import uuid
import json
from datetime import datetime

def log_activity(db, account_id, laboratory_id, target_type, target_id, action_type, summary, changes=None):
    try:
        cursor = db.cursor()
        
        log_id = uuid.uuid4().hex[:16]
        
        # Map target_type/id to specific columns
        lab_target_id = None
        set_target_id = None
        comp_target_id = None
        
        # laboratory_id is passed for context, but might also be the target
        if target_type == 'laboratory':
            lab_target_id = target_id
        elif target_type == 'computer_set':
            set_target_id = target_id
            # In new schema, we might want to store the lab context in lab_target_id too?
            # The schema has lab_target_id. Let's assume the passed 'laboratory_id' arg 
            # is the context, so we should save it if relevant.
            # But wait, look at schema (Step 370):
            # 62: lab_target_id CHAR(16) ...
            # 63: set_target_id...
            # It seems lab_target_id is the Laboratory involved.
            lab_target_id = laboratory_id 
            
        elif target_type == 'component':
             comp_target_id = target_id
             lab_target_id = laboratory_id

        # If strict mapping is preferred:
        if target_type == 'laboratory' and not lab_target_id:
            lab_target_id = target_id
            
        query = """
            INSERT INTO laboratory_activity 
            (id, account_id, lab_target_id, set_target_id, comp_target_id, action_type, summary, metadata, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        metadata_json = json.dumps(changes) if changes else json.dumps({})
        
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
        
        # Ensure changes are committed if this function is called outside a transaction? 
        # Usually it's called inside one, but let's be safe or assume caller commits.
        # The original code didn't commit. It used the passed 'db' object.
        # We will assume the caller commits.
        
        cursor.close()
        
    except Exception as e:
        print(f"Failed to log activity: {e}")
