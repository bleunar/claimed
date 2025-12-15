from flask import Flask
from flask_jwt_extended import JWTManager
from config import Config
from utilities.system_logger import setup_logging
from flask_cors import CORS

def create_app():
    app = Flask(__name__, template_folder='../templates')
    app.config.from_object(Config)
    
    # Initialize Logging
    setup_logging(app)

    # Initialize CORS
    CORS(app, resources={r"/*": {"origins": app.config['CORS_ORIGINS']}})
    
    # Initialize extensions here
    jwt = JWTManager(app)
    
    return app
