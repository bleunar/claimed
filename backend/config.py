import os
from dotenv import load_dotenv

load_dotenv()

def get_config(key, secret_file=None, default=None):
    env = os.getenv('APP_ENV', 'development')
    
    if env == 'production':
        try:
            with open(f'/run/secrets/{secret_file}', 'r') as f:
                return f.read().strip()
        except IOError:
            pass
    return os.getenv(key, default)

class Config:
    # App
    APP_ENV = os.getenv('APP_ENV', 'development')
    SECRET_KEY = get_config('SECRET_KEY', 'secret_key', 'dev_secret_key')
    
    # Database
    MYSQL_HOST = get_config('MYSQL_HOST', 'mysql_host', 'localhost')
    MYSQL_USER = get_config('MYSQL_USER', 'mysql_user', 'root')
    MYSQL_PASSWORD = get_config('MYSQL_PASSWORD', 'mysql_password', 'password')
    MYSQL_DB = get_config('MYSQL_DB', 'mysql_db', 'app_db')
    
    # JWT Config
    JWT_SECRET_KEY = get_config('JWT_SECRET_KEY', 'jwt_secret_key', 'dev_jwt_secret')
    JWT_ACCESS_TOKEN_EXPIRES = 600 # 10 minutes
    JWT_REFRESH_TOKEN_EXPIRES = 72000 # 20 hours
    
    # Check if we should allow cookies (Mixed mode: Access in Headers, Refresh in Cookies)
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = False # Set to True in production (HTTPS)
    JWT_COOKIE_SAMESITE = 'Lax'
    JWT_COOKIE_CSRF_PROTECT = False # Disabling for simplicity in this transition, can enable later

    # Email
    MAIL_SERVER = get_config('MAIL_SERVER', default='smtp.googlemail.com')
    MAIL_PORT = int(get_config('MAIL_PORT', default=587))
    MAIL_USE_TLS = get_config('MAIL_USE_TLS', default='true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = get_config('MAIL_USERNAME', 'mail_username')
    MAIL_PASSWORD = get_config('MAIL_PASSWORD', 'mail_password')

    # Default Admin Credentials (if wala pa admin account)
    DEFAULT_ADMIN_EMAIL = get_config('DEFAULT_ADMIN_EMAIL', default='admin@example.com')
    DEFAULT_ADMIN_PASSWORD = get_config('DEFAULT_ADMIN_PASSWORD', default='admin123')

    # Logs
    LOG_MODE = get_config('LOG_MODE', default='HIGH').upper()
