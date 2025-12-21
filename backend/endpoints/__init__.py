from .auth import auth_bp
from .accounts import accounts_bp
from .laboratories import laboratories_bp
from .computer_sets import computer_sets_bp
from .components import components_bp
from .analytics import analytics_bp
from flask import jsonify
import logging

logger = logging.getLogger(__name__)

def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(laboratories_bp)
    app.register_blueprint(computer_sets_bp)
    app.register_blueprint(components_bp)
    app.register_blueprint(analytics_bp)

    @app.route("/health", methods=["GET"])
    def health():
        """Health check endpoint for container orchestration."""
        from core.database import get_db
        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            return jsonify({"status": "healthy", "database": "connected"}), 200
        except Exception as e:
            return jsonify({"status": "unhealthy", "database": str(e)}), 503
