from core.instance import create_app
from core.database import init_app
from endpoints import register_blueprints
from core.startup import perform_startup_checks
from flask import jsonify

app = create_app()
init_app(app)
register_blueprints(app)
perform_startup_checks(app)

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
    app.run(debug=True, host='0.0.0.0', port=5000)
