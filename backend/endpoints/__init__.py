from .auth import auth_bp
from .accounts import accounts_bp
from .laboratories import laboratories_bp
from .locations import locations_bp
from .computer_sets import computer_sets_bp
from .components import components_bp
from .analytics import analytics_bp
from .departments import departments_bp
from flask import jsonify
import logging

logger = logging.getLogger(__name__)

def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(laboratories_bp)
    app.register_blueprint(locations_bp)
    app.register_blueprint(computer_sets_bp)
    app.register_blueprint(components_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(departments_bp)
