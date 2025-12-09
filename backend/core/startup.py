import sys
import uuid
import time
import mysql.connector
from core.database import check_connection as check_db
from core.email import email_service
from utilities.security import hash_password

def retry_operation(operation, max_retries=20, delay=15, name="Operation"):
    """
    Retries an operation up to max_retries times with a delay between attempts.
    The operation should return True on success and False on failure.
    """
    for attempt in range(1, max_retries + 1):
        try:
            if operation():
                return True
            else:
                print(f" [RETRY] {name} failed. Attempt {attempt}/{max_retries}. Retrying in {delay}s...")
        except Exception as e:
            print(f" [RETRY] {name} raised exception: {e}. Attempt {attempt}/{max_retries}. Retrying in {delay}s...")
        
        if attempt < max_retries:
            time.sleep(delay)
            
    print(f" [FAILED] {name} failed after {max_retries} attempts.")
    return False

def initialize_admin(app):
    print("Checking for admin account...")
    try:
        conn = mysql.connector.connect(
            host=app.config['MYSQL_HOST'],
            user=app.config['MYSQL_USER'],
            password=app.config['MYSQL_PASSWORD'],
            database=app.config['MYSQL_DB']
        )
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM accounts WHERE role = 'admin' LIMIT 1")
        admin = cursor.fetchone()
        
        if admin:
            print(" [OK] Admin account exists.")
        else:
            print(" [INFO] No admin account found. Creating default admin...")
            email = app.config['DEFAULT_ADMIN_EMAIL']
            password = app.config['DEFAULT_ADMIN_PASSWORD']
            hashed_password = hash_password(password)
            account_id = uuid.uuid4().hex[:16]
            
            query = """
                INSERT INTO accounts (id, role, name, email, password_hash, status)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            values = (account_id, 'admin', 'System Admin', email, hashed_password, 'active')
            
            cursor.execute(query, values)
            conn.commit()
            print(f" [CREATED] Default admin created: {email}")
            
        cursor.close()
        conn.close()
        return True
    except mysql.connector.Error as err:
        print(f" [ERROR] Failed to initialize admin: {err}")
        return False

def print_config(app):
    print("\n--- System Configuration ---")
    for key, value in app.config.items():
        if key.isupper():
            if any(secret in key.upper() for secret in ['KEY', 'PASSWORD', 'SECRET', 'TOKEN']):
                print(f"{key}: ********")
            else:
                print(f"{key}: {value}")
    print("----------------------------\n")

def perform_startup_checks(app):
    print("Starting system checks...")
    
    # 1. Print Config
    print_config(app)
    
    # 2. Check Database
    print("Checking database connection...")
    db_status = retry_operation(lambda: check_db(app), name="Database Connection")
    
    # 3. Check Email
    print("Checking email server connection...")
    email_status = retry_operation(lambda: email_service.check_connection(app), name="Email Connection")
    
    if not db_status:
        print("\nCRITICAL: Database check failed. Exiting.")
        sys.exit(1)
        
    # 4. Initialize Admin
    admin_status = initialize_admin(app)
    if not admin_status:
         print("\nWARNING: Admin initialization failed.")

    print("\nSystem checks completed successfully.\n")
