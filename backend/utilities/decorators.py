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
