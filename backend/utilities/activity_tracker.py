"""Online activity tracker for account presence detection with device tracking.

Supports two backends:
- In-memory (development): Fast, single-process only
- Redis (production): Shared across all workers

Backend is selected based on REDIS_URL environment variable.

An account is considered "online" if it has activity within the timeout period (default 15 minutes).
Tracks devices/IPs per account to count multi-device logins.
"""
import os
import time
import logging
import json

logger = logging.getLogger(__name__)

# Default timeout in seconds (15 minutes)
DEFAULT_TIMEOUT = 900


class InMemoryActivityTracker:
    """In-memory activity tracking for development (single process)."""
    
    def __init__(self, timeout=DEFAULT_TIMEOUT):
        # account_id -> {ip_address: last_activity_timestamp}
        self._activity = {}
        self._timeout = timeout
        logger.info(f"Using in-memory activity tracker (timeout: {timeout}s)")
    
    def update_activity(self, account_id, ip_address=None):
        """Record activity for an account from a specific IP/device."""
        if account_id not in self._activity:
            self._activity[account_id] = {}
        
        # Use 'unknown' if no IP provided
        ip_key = ip_address or 'unknown'
        self._activity[account_id][ip_key] = time.time()
        self._cleanup()
    
    def remove_activity(self, account_id, ip_address=None):
        """Remove an account/device from tracking (e.g., on logout)."""
        if account_id not in self._activity:
            return
        
        if ip_address:
            # Remove only the specific device
            self._activity[account_id].pop(ip_address, None)
            # If no more devices, remove the account
            if not self._activity[account_id]:
                del self._activity[account_id]
        else:
            # Remove all devices for this account
            del self._activity[account_id]
    
    def is_online(self, account_id):
        """Check if an account is considered online (on any device)."""
        devices = self._activity.get(account_id, {})
        now = time.time()
        for ip, last_activity in devices.items():
            if (now - last_activity) < self._timeout:
                return True
        return False
    
    def get_online_count(self):
        """Get count of online accounts (unique accounts, not devices)."""
        self._cleanup()
        return len(self._activity)
    
    def get_online_device_count(self):
        """Get total count of online devices across all accounts."""
        self._cleanup()
        return sum(len(devices) for devices in self._activity.values())
    
    def get_account_device_count(self, account_id):
        """Get count of devices where a specific account is logged in."""
        self._cleanup()
        return len(self._activity.get(account_id, {}))
    
    def get_account_devices(self, account_id):
        """Get list of IPs where an account is logged in."""
        self._cleanup()
        return list(self._activity.get(account_id, {}).keys())
    
    def get_online_accounts(self):
        """Get list of online account IDs."""
        self._cleanup()
        return list(self._activity.keys())
    
    def _cleanup(self):
        """Remove expired activity records."""
        now = time.time()
        accounts_to_remove = []
        
        for account_id, devices in self._activity.items():
            # Remove expired devices
            expired_ips = [
                ip for ip, ts in devices.items() 
                if (now - ts) >= self._timeout
            ]
            for ip in expired_ips:
                del devices[ip]
            
            # Mark account for removal if no devices left
            if not devices:
                accounts_to_remove.append(account_id)
        
        for account_id in accounts_to_remove:
            del self._activity[account_id]


class RedisActivityTracker:
    """Redis-backed activity tracking for production (multi-process)."""
    
    def __init__(self, redis_url, timeout=DEFAULT_TIMEOUT):
        import redis
        self._redis = redis.from_url(redis_url, decode_responses=True)
        self._timeout = timeout
        self._prefix = "online:"
        self._devices_prefix = "online_devices:"
        self._set_key = "online_accounts"
        logger.info(f"Using Redis activity tracker (timeout: {timeout}s)")
    
    def _account_key(self, account_id):
        return f"{self._prefix}{account_id}"
    
    def _device_key(self, account_id, ip_address):
        return f"{self._devices_prefix}{account_id}:{ip_address}"
    
    def update_activity(self, account_id, ip_address=None):
        """Record activity for an account from a specific IP/device."""
        ip_key = ip_address or 'unknown'
        
        # Set account key (indicates account is online)
        account_key = self._account_key(account_id)
        self._redis.setex(account_key, self._timeout, str(time.time()))
        
        # Set device key (tracks individual device sessions)
        device_key = self._device_key(account_id, ip_key)
        self._redis.setex(device_key, self._timeout, str(time.time()))
        
        # Track device in account's device set
        devices_set_key = f"devices:{account_id}"
        self._redis.sadd(devices_set_key, ip_key)
        self._redis.expire(devices_set_key, self._timeout)
        
        # Add to online accounts set
        self._redis.sadd(self._set_key, account_id)
    
    def remove_activity(self, account_id, ip_address=None):
        """Remove an account/device from tracking (e.g., on logout)."""
        if ip_address:
            # Remove only the specific device
            device_key = self._device_key(account_id, ip_address)
            self._redis.delete(device_key)
            
            devices_set_key = f"devices:{account_id}"
            self._redis.srem(devices_set_key, ip_address)
            
            # Check if there are still active devices
            if self._redis.scard(devices_set_key) == 0:
                account_key = self._account_key(account_id)
                self._redis.delete(account_key)
                self._redis.srem(self._set_key, account_id)
        else:
            # Remove all traces of this account
            account_key = self._account_key(account_id)
            devices_set_key = f"devices:{account_id}"
            
            # Get all devices and remove their keys
            devices = self._redis.smembers(devices_set_key)
            for ip in devices:
                device_key = self._device_key(account_id, ip)
                self._redis.delete(device_key)
            
            self._redis.delete(account_key)
            self._redis.delete(devices_set_key)
            self._redis.srem(self._set_key, account_id)
    
    def is_online(self, account_id):
        """Check if an account is considered online (on any device)."""
        key = self._account_key(account_id)
        return self._redis.exists(key) > 0
    
    def get_online_count(self):
        """Get count of online accounts (unique accounts, not devices)."""
        self._cleanup_set()
        return self._redis.scard(self._set_key)
    
    def get_online_device_count(self):
        """Get total count of online devices across all accounts."""
        self._cleanup_set()
        total = 0
        members = self._redis.smembers(self._set_key)
        for account_id in members:
            total += self.get_account_device_count(account_id)
        return total
    
    def get_account_device_count(self, account_id):
        """Get count of devices where a specific account is logged in."""
        devices_set_key = f"devices:{account_id}"
        # Clean up expired devices
        devices = self._redis.smembers(devices_set_key)
        active_count = 0
        for ip in devices:
            device_key = self._device_key(account_id, ip)
            if self._redis.exists(device_key):
                active_count += 1
            else:
                self._redis.srem(devices_set_key, ip)
        return active_count
    
    def get_account_devices(self, account_id):
        """Get list of IPs where an account is logged in."""
        devices_set_key = f"devices:{account_id}"
        devices = list(self._redis.smembers(devices_set_key))
        # Filter to only active devices
        return [ip for ip in devices if self._redis.exists(self._device_key(account_id, ip))]
    
    def get_online_accounts(self):
        """Get list of online account IDs."""
        self._cleanup_set()
        return list(self._redis.smembers(self._set_key))
    
    def _cleanup_set(self):
        """Remove expired accounts from the set."""
        members = self._redis.smembers(self._set_key)
        for account_id in members:
            if not self.is_online(account_id):
                self._redis.srem(self._set_key, account_id)


def create_activity_tracker():
    """Create the appropriate activity tracker based on environment."""
    redis_url = os.environ.get('REDIS_URL')
    
    if redis_url:
        try:
            return RedisActivityTracker(redis_url)
        except Exception as e:
            logger.warning(f"Failed to connect to Redis, falling back to in-memory: {e}")
            return InMemoryActivityTracker()
    
    logger.info("Using in-memory activity tracker (development mode)")
    return InMemoryActivityTracker()


# Module-level singleton
activity_tracker = create_activity_tracker()
