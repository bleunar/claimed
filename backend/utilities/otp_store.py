"""OTP storage with TTL expiry and security features.

Supports two backends:
- In-memory (development): Fast, single-process only
- Redis (production): Shared across all workers

Backend is selected based on REDIS_URL environment variable.

Security Features:
- Brute force protection (max failed attempts)
- Request cooldown to prevent OTP spam
- One-time use OTPs
"""
import os
import time
import json
import logging

logger = logging.getLogger(__name__)


class InMemoryOTPStore:
    """In-memory OTP storage for development (single process)."""
    
    def __init__(self, ttl=300, max_attempts=5, cooldown=60):
        self._store = {}
        self._ttl = ttl  # 5 minute default
        self._max_attempts = max_attempts
        self._cooldown = cooldown
        self._request_timestamps = {}

    def can_request_otp(self, key):
        """Check if enough time has passed since last OTP request."""
        last_request = self._request_timestamps.get(key, 0)
        elapsed = time.time() - last_request
        
        if elapsed < self._cooldown:
            remaining = int(self._cooldown - elapsed)
            return False, remaining
        return True, 0

    def set_otp(self, key, otp, data=None):
        """Store an OTP with associated data."""
        can_request, remaining = self.can_request_otp(key)
        if not can_request:
            return False, f"Please wait {remaining} seconds before requesting a new OTP"
        
        self._store[key] = {
            'otp': otp,
            'expiry': time.time() + self._ttl,
            'data': data,
            'attempts': 0
        }
        self._request_timestamps[key] = time.time()
        self._cleanup()
        return True, None

    def verify_otp(self, key, otp):
        """Verify OTP and return associated data if valid."""
        record = self._store.get(key)
        if not record:
            return False, None, "Invalid or expired OTP"
        
        if time.time() > record['expiry']:
            del self._store[key]
            return False, None, "OTP has expired"
        
        if record['attempts'] >= self._max_attempts:
            del self._store[key]
            return False, None, "Too many failed attempts. Please request a new OTP"
            
        if record['otp'] != otp:
            record['attempts'] += 1
            remaining = self._max_attempts - record['attempts']
            if remaining <= 0:
                del self._store[key]
                return False, None, "Too many failed attempts. Please request a new OTP"
            return False, None, f"Invalid OTP. {remaining} attempts remaining"
            
        data = record.get('data')
        del self._store[key]
        
        if key in self._request_timestamps:
            del self._request_timestamps[key]
            
        return True, data, None

    def _cleanup(self):
        """Remove expired OTPs from storage."""
        now = time.time()
        keys_to_delete = [k for k, v in self._store.items() if now > v['expiry']]
        for k in keys_to_delete:
            del self._store[k]
        
        old_timestamps = [k for k, v in self._request_timestamps.items() 
                         if now - v > 3600]
        for k in old_timestamps:
            del self._request_timestamps[k]


class RedisOTPStore:
    """Redis-backed OTP storage for production (multi-process)."""
    
    def __init__(self, redis_url, ttl=300, max_attempts=5, cooldown=60):
        import redis
        self._redis = redis.from_url(redis_url, decode_responses=True)
        self._ttl = ttl
        self._max_attempts = max_attempts
        self._cooldown = cooldown
        self._prefix = "otp:"
        self._cooldown_prefix = "otp_cooldown:"
        logger.info("Using Redis OTP storage")

    def _otp_key(self, key):
        return f"{self._prefix}{key}"
    
    def _cooldown_key(self, key):
        return f"{self._cooldown_prefix}{key}"

    def can_request_otp(self, key):
        """Check if enough time has passed since last OTP request."""
        cooldown_key = self._cooldown_key(key)
        ttl = self._redis.ttl(cooldown_key)
        
        if ttl > 0:
            return False, ttl
        return True, 0

    def set_otp(self, key, otp, data=None):
        """Store an OTP with associated data."""
        can_request, remaining = self.can_request_otp(key)
        if not can_request:
            return False, f"Please wait {remaining} seconds before requesting a new OTP"
        
        otp_key = self._otp_key(key)
        record = {
            'otp': otp,
            'data': data,
            'attempts': 0
        }
        
        # Store OTP with TTL
        self._redis.setex(otp_key, self._ttl, json.dumps(record))
        
        # Set cooldown
        self._redis.setex(self._cooldown_key(key), self._cooldown, "1")
        
        return True, None

    def verify_otp(self, key, otp):
        """Verify OTP and return associated data if valid."""
        otp_key = self._otp_key(key)
        record_json = self._redis.get(otp_key)
        
        if not record_json:
            return False, None, "Invalid or expired OTP"
        
        record = json.loads(record_json)
        
        if record['attempts'] >= self._max_attempts:
            self._redis.delete(otp_key)
            return False, None, "Too many failed attempts. Please request a new OTP"
            
        if record['otp'] != otp:
            record['attempts'] += 1
            remaining = self._max_attempts - record['attempts']
            
            if remaining <= 0:
                self._redis.delete(otp_key)
                return False, None, "Too many failed attempts. Please request a new OTP"
            
            # Update attempts count, preserve TTL
            ttl = self._redis.ttl(otp_key)
            if ttl > 0:
                self._redis.setex(otp_key, ttl, json.dumps(record))
            
            return False, None, f"Invalid OTP. {remaining} attempts remaining"
            
        # Success - delete OTP
        self._redis.delete(otp_key)
        self._redis.delete(self._cooldown_key(key))
        
        return True, record.get('data'), None


def create_otp_store():
    """Create the appropriate OTP store based on environment."""
    redis_url = os.environ.get('REDIS_URL')
    
    if redis_url:
        try:
            return RedisOTPStore(redis_url)
        except Exception as e:
            logger.warning(f"Failed to connect to Redis, falling back to in-memory: {e}")
            return InMemoryOTPStore()
    
    logger.info("Using in-memory OTP storage (development mode)")
    return InMemoryOTPStore()


# Module-level singleton
otp_store = create_otp_store()
