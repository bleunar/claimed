import uuid
import json

def log_activity(db, account_id, lab_id, target_type, target_id, action_type, summary, changes=None, snapshot_context=None):
    """
    Logs an activity to the laboratory_activity table.
    
    Args:
        db: Database connection object
        account_id: ID of the user performing the action
        lab_id: ID of the laboratory involved (can be None)
        target_type: 'laboratory', 'computer_set', 'component'
        target_id: ID of the specific target
        action_type: 'create', 'update', 'delete', 'status_change'
        summary: Human-readable summary string
        changes: Dictionary of changes (optional)
        snapshot_context: Dictionary of context snapshot (optional)
    """
    cursor = db.cursor()
    
    activity_id = uuid.uuid4().hex[:16]
    
    # Map target types to columns
    lab_target_id = None
    set_target_id = None
    comp_target_id = None
    
    if target_type == 'laboratory':
        # Only set FK if not deleting, as the row will be gone
        if action_type != 'delete':
            lab_target_id = target_id
    elif target_type == 'computer_set':
        # Only set FK if not deleting, as the row will be gone
        if action_type != 'delete':
            set_target_id = target_id
        lab_target_id = lab_id 
    elif target_type == 'component':
        # Only set FK if not deleting
        if action_type != 'delete':
            comp_target_id = target_id
        lab_target_id = lab_id

    # Construct Metadata
    metadata = {}
    if changes:
        metadata['changes'] = changes
    if snapshot_context:
        metadata['snapshot'] = snapshot_context
        
    metadata_json = json.dumps(metadata)
    
    try:
        query = """
            INSERT INTO laboratory_activity 
            (id, account_id, lab_target_id, set_target_id, comp_target_id, action_type, summary, metadata, email_notification_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending')
        """
        cursor.execute(query, (activity_id, account_id, lab_target_id, set_target_id, comp_target_id, action_type, summary, metadata_json))
        # Note: Commit is expected to be handled by the caller/transaction wrapper
    except Exception as e:
        # Fallback logging? For now just re-raise or print so we don't silence DB errors silently
        print(f"Failed to log activity: {e}")
        raise e
