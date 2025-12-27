"""
Birthday Token Utility
Provides simple encryption/verification for birthday celebration tracking
"""

import hashlib
import hmac
from config import Config


def generate_birthday_token(account_id: str, year: int) -> str:
    """
    Generate an encrypted token for birthday celebration tracking.
    Uses HMAC-SHA256 for secure hashing.
    
    Args:
        account_id: The account's unique identifier
        year: The year of the celebration
    
    Returns:
        A hex-encoded token that obscures the account ID
    """
    secret = Config.SECRET_KEY or 'default-birthday-secret'
    message = f"{account_id}:{year}"
    
    token = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return token


def verify_birthday_token(account_id: str, year: int, token: str) -> bool:
    """
    Verify if a token matches the expected value for an account/year combination.
    
    Args:
        account_id: The account's unique identifier
        year: The year to verify
        token: The token to verify
    
    Returns:
        True if the token is valid, False otherwise
    """
    expected_token = generate_birthday_token(account_id, year)
    return hmac.compare_digest(expected_token, token)
