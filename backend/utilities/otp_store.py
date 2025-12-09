import time

# TEMPORARY OTP SETUP, might make a redis database hehe

class OTPStore:
    def __init__(self, ttl=300):
        self._store = {}
        self._ttl = ttl  # 5 minute default

    def set_otp(self, key, otp, data=None):
        self._store[key] = {
            'otp': otp,
            'expiry': time.time() + self._ttl,
            'data': data
        }
        self._cleanup()

    def verify_otp(self, key, otp):
        record = self._store.get(key)
        if not record:
            return False, None
        
        if time.time() > record['expiry']:
            del self._store[key]
            return False, None
            
        if record['otp'] != otp:
            return False, None
            
        # sakses
        data = record.get('data')
        del self._store[key]  # OTP is one-time use
        return True, data

    # remove expired memories :(
    def _cleanup(self):
        now = time.time()
        
        # Create a list of keys to delete to avoid modifying dict while iterating
        keys_to_delete = [k for k, v in self._store.items() if now > v['expiry']]
        for k in keys_to_delete:
            del self._store[k]

# Global instance
otp_store = OTPStore()
