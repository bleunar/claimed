import os
from dotenv import load_dotenv

load_dotenv()

def get_config(key, secret_file=None, default=None):
    if secret_file:
        try:
            with open(f'/run/secrets/{secret_file}', 'r') as f:
                return f.read().strip()
        except IOError:
            pass
    return os.getenv(key, default)

class Config:
    APP_ENV =  os.getenv('APP_ENV', 'development')
    LOG_MODE = get_config('LOG_MODE', default='MAX').upper()
    CORS_ORIGINS = get_config('CORS_ORIGINS', default='*').split(',')
    
    SECRET_KEY = get_config('SECRET_KEY', 'secret_key')
    
    # JWT
    JWT_SECRET_KEY = get_config('JWT_SECRET_KEY', 'jwt_secret_key')
    JWT_ACCESS_TOKEN_EXPIRES = 1800  # 30 minutes
    JWT_REFRESH_TOKEN_EXPIRES = 72000
    
    JWT_TOKEN_LOCATION = ['headers', 'cookies']
    JWT_COOKIE_SECURE = os.getenv('APP_ENV', 'development') == "production"
    JWT_COOKIE_SAMESITE = 'None' if os.getenv('APP_ENV', 'development') == "production" else 'Lax'
    JWT_COOKIE_DOMAIN = get_config('JWT_COOKIE_DOMAIN', default=None)  # Set to '.example.com' in production for cross-subdomain auth
    JWT_COOKIE_CSRF_PROTECT = os.getenv('APP_ENV', 'development') == "production"
    
    # Database
    MYSQL_HOST = get_config('MYSQL_HOST', 'mysql_host')
    MYSQL_USER = get_config('MYSQL_USER', 'mysql_user')
    MYSQL_PASSWORD = get_config('MYSQL_PASSWORD', 'mysql_password')
    MYSQL_DB = get_config('MYSQL_DB', 'mysql_db', 'app_db')

    # Email
    MAIL_SERVER = get_config('MAIL_SERVER', 'mail_server', 'smtp.example.com')
    MAIL_PORT = int(get_config('MAIL_PORT', 'mail_server_port',default=587))
    MAIL_USE_TLS = get_config('MAIL_USE_TLS', default='true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = get_config('MAIL_USERNAME', 'mail_username')
    MAIL_PASSWORD = get_config('MAIL_PASSWORD', 'mail_password')

    # Default Admin Credentials (used if no admin account exists)
    DEFAULT_ADMIN_EMAIL = get_config('DEFAULT_ADMIN_EMAIL', 'default_admin_email')
    DEFAULT_ADMIN_PASSWORD = get_config('DEFAULT_ADMIN_PASSWORD', 'default_admin_password')