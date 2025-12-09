from flask import Flask
from flask_jwt_extended import JWTManager
from config import Config
from utilities.system_logger import setup_logging

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize Logging
    setup_logging(app)
    
    # Initialize extensions here
    jwt = JWTManager(app)
    
    return app
