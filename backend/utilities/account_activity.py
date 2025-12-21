"""Account activity logging utility."""
import logging
import uuid
from datetime import datetime, timezone
from flask import request, has_request_context
from core.database import get_db

logger = logging.getLogger(__name__)

# Valid activity actions
ACTIVITY_ACTIONS = [
    'login', 'logout', 'password_reset', 'password_changed',
    'email_updated', 'school_id_updated', 'role_changed',
    'suspended', 'activated', 'deleted', 'profile_updated'
]


def log_activity(account_id: str, action: str, details: dict = None) -> bool:
    """Log an account activity.
    
    Args:
        account_id: The account ID to log activity for
        action: The action type (must be in ACTIVITY_ACTIONS)
        details: Optional JSON-serializable details dict
    
    Returns:
        True if logged successfully, False otherwise
    """
    if action not in ACTIVITY_ACTIONS:
        logger.warning(f"Invalid activity action: {action}")
        return False
    
    # Get IP address from request context if available
    ip_address = None
    if has_request_context():
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
    
    try:
        db = get_db()
        cursor = db.cursor()
        
        activity_id = uuid.uuid4().hex[:16]
        details_json = None
        if details:
            import json
            details_json = json.dumps(details)
        
        # Use explicit UTC timestamp
        created_at = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        
        cursor.execute(
            """INSERT INTO account_activities (id, account_id, action, details, ip_address, created_at) 
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (activity_id, account_id, action, details_json, ip_address, created_at)
        )
        db.commit()
        cursor.close()
        return True
    except Exception as e:
        logger.exception(f"Failed to log activity: {action} for account {account_id}")
        return False

