from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

def get_limiter_storage_uri():
    """
    Get the storage URI for Flask-Limiter.
    - Development: in-memory storage (no Redis required)
    - Production: Redis storage
    """
    from config import Config
    if Config.APP_ENV == 'production':
        return Config.REDIS_URL
    # In-memory storage for development
    return 'memory://'

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=get_limiter_storage_uri()
)
