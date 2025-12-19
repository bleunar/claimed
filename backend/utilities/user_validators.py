import re

def validate_password(password):
    """
    Validates that the password meets the complexity requirements:
    - At least 8 characters long
    - At least one uppercase letter
    - At least one digit
    
    Returns:
        tuple: (bool, str) - (True, None) if valid, (False, error_message) if invalid.
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
        
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
        
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
        
    return True, None
