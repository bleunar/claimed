from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt


def role_required(required_roles):
    """Decorator to restrict endpoint access based on user role.
    
    Args:
        required_roles: Single role string or list of allowed roles
    
    Usage:
        @role_required(['admin', 'it_head'])
        def admin_endpoint():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get("role")
            
            if isinstance(required_roles, list):
                if user_role not in required_roles:
                    return jsonify(msg="Insufficient Access"), 403
            else:
                if user_role != required_roles:
                    return jsonify(msg="Insufficient Access"), 403
                    
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def verify_role_freshness(fn):
    """Decorator to verify that the JWT role claim matches the database role.
    
    This prevents stale JWT tokens from being used for major system actions
    after a user's role has been changed by an administrator.
    
    If mismatch detected, returns HTTP 419 with role_mismatch flag,
    prompting the frontend to request password re-authentication.
    
    Usage:
        @jwt_required()
        @verify_role_freshness
        def sensitive_action():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        from flask_jwt_extended import get_jwt_identity
        from core.database import get_db
        
        claims = get_jwt()
        jwt_role = claims.get("role")
        user_id = get_jwt_identity()
        
        # Fetch current role from database
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT role FROM accounts WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        
        if not user:
            return jsonify(msg="Account not found"), 404
        
        db_role = user['role']
        
        # Check if role has changed
        if jwt_role != db_role:
            return jsonify(
                msg="Your role has been changed. Please verify your identity to continue.",
                role_mismatch=True,
                current_role=db_role
            ), 419
        
        return fn(*args, **kwargs)
    return wrapper

