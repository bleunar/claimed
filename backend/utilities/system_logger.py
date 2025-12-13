import logging
import os
import sys
from datetime import datetime
from flask import has_request_context, request

class RequestFormatter(logging.Formatter):
    def format(self, record):
        if has_request_context():
            record.url = request.url
            record.remote_addr = request.remote_addr
            record.method = request.method
        else:
            record.url = None
            record.remote_addr = None
            record.method = None
        return super().format(record)

def setup_logging(app):
    log_mode = app.config.get('LOG_MODE', 'HIGH')
    
    # create log dir if not exist
    log_dir = os.path.join(os.getcwd(), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # generate filename: yyyy_ddd_timestamp.txt
    timestamp = datetime.now().strftime('%Y_%j_%H%M%S')
    log_file = os.path.join(log_dir, f"{timestamp}.txt")
    
    # root logger configuration
    root_logger = logging.getLogger()
    
    # Clear existing handlers
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    # Handlers
    file_handler = logging.FileHandler(log_file, delay=True)
    console_handler = logging.StreamHandler(sys.stdout)
    
    # Formatters
    file_formatter = RequestFormatter(
        '[%(asctime)s] %(remote_addr)s requested %(url)s\n'
        '%(levelname)s in %(module)s: %(message)s'
    )
    console_formatter = None # Set based on mode

    # Level Logic
    if log_mode == 'HIGH':
        # Detailed logs (DEBUG) for both
        root_logger.setLevel(logging.DEBUG)
        
        file_handler.setLevel(logging.DEBUG)
        console_handler.setLevel(logging.DEBUG)
        
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
    elif log_mode == 'LOW':
        # Necessary details (INFO) for both
        root_logger.setLevel(logging.INFO)
        
        file_handler.setLevel(logging.INFO)
        console_handler.setLevel(logging.INFO)
        
        console_formatter = logging.Formatter(
            '%(levelname)s: %(message)s'
        )
        
    else: # NONE
        # No logging
        # We might still want CRITICAL errors to show up? 
        # User said "NONE no logging".
        root_logger.setLevel(logging.CRITICAL + 1)
        # Don't add handlers if NONE
        app.logger.info("Logging disabled (NONE mode)")
        return

    # Apply Formatters
    file_handler.setFormatter(file_formatter)
    console_handler.setFormatter(console_formatter)
    
    # Add Handlers
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
        
    # Hijack werkzeug
    logging.getLogger('werkzeug').handlers = root_logger.handlers
    
    app.logger.info(f"Logging initialized in {log_mode} mode. Writing to {log_file}")
