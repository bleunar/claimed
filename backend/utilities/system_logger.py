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
    # where, ddd = day of the year (365 o3 366)
    timestamp = datetime.now().strftime('%Y_%j_%H%M%S')
    log_file = os.path.join(log_dir, f"{timestamp}.txt")
    
    # root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    
    # Clear existing handlers to avoid duplicates
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    # File Handler (Critical/Error logs)
    file_handler = logging.FileHandler(log_file, delay=True)
    file_handler.setLevel(logging.ERROR) 
    file_formatter = RequestFormatter(
        '[%(asctime)s] %(remote_addr)s requested %(url)s\n'
        '%(levelname)s in %(module)s: %(message)s'
    )
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    
    if log_mode == 'HIGH':
        # Detailed logs
        console_handler.setLevel(logging.DEBUG)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    elif log_mode == 'LOW':
        # Minimal logs
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(levelname)s: %(message)s'
        )
    else: # NONE
        console_handler.setLevel(logging.CRITICAL + 1)
        console_formatter = logging.Formatter('%(message)s')

    console_handler.setFormatter(console_formatter)
    
    if log_mode != 'NONE':
        root_logger.addHandler(console_handler)
        
    logging.getLogger('werkzeug').handlers = root_logger.handlers
    
    app.logger.info(f"Logging initialized in {log_mode} mode. Critical logs writing to {log_file}")
