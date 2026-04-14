import sys
import os

# Add cwd to path
sys.path.append(os.getcwd())

from flask import Flask
from core.database import get_db
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

def check():
    with app.app_context():
        print("Connecting to DB...", flush=True)
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            print("Connected.", flush=True)
            
            # 1. Count
            cursor.execute("SELECT COUNT(*) as c FROM account_activities")
            count = cursor.fetchone()['c']
            print(f"Total Activities: {count}", flush=True)
            
            if count > 0:
                cursor.execute("SELECT * FROM account_activities ORDER BY created_at DESC LIMIT 1")
                print(f"Sample: {cursor.fetchone()}", flush=True)
            else:
                print("Table is empty.", flush=True)

        except Exception as e:
            print(f"Error: {e}", flush=True)
            
if __name__ == "__main__":
    check()
