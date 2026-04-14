"""Database utility functions for reducing boilerplate."""
import json
import uuid
from contextlib import contextmanager
from flask import g, current_app
import mysql.connector


@contextmanager
def get_cursor(dictionary=True):
    """Context manager for database cursor with auto-close.
    
    Usage:
        with get_cursor() as cursor:
            cursor.execute("SELECT * FROM table")
            result = cursor.fetchone()
    """
    from core.database import get_db
    db = get_db()
    cursor = db.cursor(dictionary=dictionary)
    try:
        yield cursor
    finally:
        cursor.close()


def parse_json_field(value, default=None):
    """Parse a JSON field from database, handling None and string values.
    
    Args:
        value: The field value (could be None, dict, or JSON string)
        default: Default value if parsing fails (default: empty dict)
    
    Returns:
        Parsed dict or the default value
    """
    if default is None:
        default = {}
    
    if value is None:
        return default
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return default
    return default


def generate_id(length=16):
    """Generate a unique ID for database records.
    
    Args:
        length: Length of the ID (default: 16)
    
    Returns:
        Hex string ID
    """
    return uuid.uuid4().hex[:length]
