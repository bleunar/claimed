from .auth import auth_bp
from .accounts import accounts_bp
from .laboratories import laboratories_bp
from .computer_sets import computer_sets_bp
from .components import components_bp
from .analytics import analytics_bp
from .activities import activities_bp
from .issues import issues_bp
from flask import jsonify

def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(laboratories_bp)
    app.register_blueprint(computer_sets_bp)
    app.register_blueprint(components_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(activities_bp)
    app.register_blueprint(issues_bp)

    # Status endpoint
    @app.route("/status", methods=["GET"])
    def status():
        return jsonify({"status": "ok"})
