from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt

# sekyu 
def role_required(required_roles):
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
