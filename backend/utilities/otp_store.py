"""In-memory OTP storage with TTL expiry and security features.

Note: OTPs are lost on server restart. For production with multiple
instances, consider using Redis or database-backed storage.

Security Features:
- Brute force protection (max failed attempts)
- Request cooldown to prevent OTP spam
- One-time use OTPs
"""
import time


class OTPStore:
    """Store and verify one-time passwords with automatic expiry and security."""
    
    def __init__(self, ttl=300, max_attempts=5, cooldown=60):
        self._store = {}
        self._ttl = ttl  # 5 minute default
        self._max_attempts = max_attempts  # Max failed verification attempts
        self._cooldown = cooldown  # Seconds between OTP requests
        self._request_timestamps = {}  # Track last request time per key

    def can_request_otp(self, key):
        """Check if enough time has passed since last OTP request.
        
        Returns:
            tuple: (can_request: bool, seconds_remaining: int)
        """
        last_request = self._request_timestamps.get(key, 0)
        elapsed = time.time() - last_request
        
        if elapsed < self._cooldown:
            remaining = int(self._cooldown - elapsed)
            return False, remaining
        return True, 0

    def set_otp(self, key, otp, data=None):
        """Store an OTP with associated data.
        
        Returns:
            tuple: (success: bool, error_msg: str or None)
        """
        # Check cooldown
        can_request, remaining = self.can_request_otp(key)
        if not can_request:
            return False, f"Please wait {remaining} seconds before requesting a new OTP"
        
        self._store[key] = {
            'otp': otp,
            'expiry': time.time() + self._ttl,
            'data': data,
            'attempts': 0  # Track failed attempts
        }
        self._request_timestamps[key] = time.time()
        self._cleanup()
        return True, None

    def verify_otp(self, key, otp):
        """Verify OTP and return associated data if valid.
        
        Returns:
            tuple: (success: bool, data: dict or None, error_msg: str or None)
        """
        record = self._store.get(key)
        if not record:
            return False, None, "Invalid or expired OTP"
        
        # Check expiry
        if time.time() > record['expiry']:
            del self._store[key]
            return False, None, "OTP has expired"
        
        # Check if max attempts exceeded
        if record['attempts'] >= self._max_attempts:
            del self._store[key]
            return False, None, "Too many failed attempts. Please request a new OTP"
            
        # Verify OTP
        if record['otp'] != otp:
            record['attempts'] += 1
            remaining = self._max_attempts - record['attempts']
            if remaining <= 0:
                del self._store[key]
                return False, None, "Too many failed attempts. Please request a new OTP"
            return False, None, f"Invalid OTP. {remaining} attempts remaining"
            
        data = record.get('data')
        del self._store[key]  # OTP is one-time use
        
        # Clean up request timestamp
        if key in self._request_timestamps:
            del self._request_timestamps[key]
            
        return True, data, None

    def _cleanup(self):
        """Remove expired OTPs from storage."""
        now = time.time()
        keys_to_delete = [k for k, v in self._store.items() if now > v['expiry']]
        for k in keys_to_delete:
            del self._store[k]
        
        # Also cleanup old request timestamps (older than 1 hour)
        old_timestamps = [k for k, v in self._request_timestamps.items() 
                         if now - v > 3600]
        for k in old_timestamps:
            del self._request_timestamps[k]


otp_store = OTPStore()
