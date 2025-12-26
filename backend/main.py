from core.instance import create_app
from core.database import init_app
from endpoints import register_blueprints
from core.startup import perform_startup_checks
from utilities.activity_tracker import activity_tracker

from flask import send_from_directory, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
import os

app = create_app()
init_app(app)
register_blueprints(app)
perform_startup_checks(app)

# Ensure uploads directory exists
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'profile')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.after_request
def track_user_activity(response):
    """Track user activity for online status detection."""
    from flask import request
    import logging
    logger = logging.getLogger(__name__)
    
    # Only track on successful responses
    if response.status_code >= 200 and response.status_code < 400:
        try:
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            if identity:
                # Get client IP address (handles proxies)
                ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
                if ip_address and ',' in ip_address:
                    # X-Forwarded-For can contain multiple IPs, take the first
                    ip_address = ip_address.split(',')[0].strip()
                activity_tracker.update_activity(identity, ip_address)
                logger.debug(f"Activity tracked for {identity} from {ip_address}. Online count: {activity_tracker.get_online_count()}")
        except Exception as e:
            # Silently ignore any JWT errors (but log for debug)
            logger.debug(f"JWT verification failed in activity tracker: {e}")
    return response

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(os.path.join(os.getcwd(), 'uploads'), filename)

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for container orchestration."""
    from core.database import get_db
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        return jsonify({"status": "healthy", "database": "connected"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "database": str(e)}), 503

if __name__ == '__main__':
    app.run()

