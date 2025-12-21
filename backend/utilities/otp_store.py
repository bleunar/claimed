"""In-memory OTP storage with TTL expiry.

Note: OTPs are lost on server restart. For production with multiple
instances, consider using Redis or database-backed storage.
"""
import time


class OTPStore:
    """Store and verify one-time passwords with automatic expiry."""
    
    def __init__(self, ttl=300):
        self._store = {}
        self._ttl = ttl  # 5 minute default

    def set_otp(self, key, otp, data=None):
        """Store an OTP with associated data."""
        self._store[key] = {
            'otp': otp,
            'expiry': time.time() + self._ttl,
            'data': data
        }
        self._cleanup()

    def verify_otp(self, key, otp):
        """Verify OTP and return associated data if valid.
        
        Returns:
            tuple: (success: bool, data: dict or None)
        """
        record = self._store.get(key)
        if not record:
            return False, None
        
        if time.time() > record['expiry']:
            del self._store[key]
            return False, None
            
        if record['otp'] != otp:
            return False, None
            
        data = record.get('data')
        del self._store[key]  # OTP is one-time use
        return True, data

    def _cleanup(self):
        """Remove expired OTPs from storage."""
        now = time.time()
        keys_to_delete = [k for k, v in self._store.items() if now > v['expiry']]
        for k in keys_to_delete:
            del self._store[k]


otp_store = OTPStore()
