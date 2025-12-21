"""System logging configuration with MAX/MIN modes."""
import logging
import os
import sys
from datetime import datetime
from flask import has_request_context, request


class RequestFormatter(logging.Formatter):
    """Formatter that includes request context when available."""
    
    def format(self, record):
        if has_request_context():
            record.url = request.url
            record.remote_addr = request.remote_addr
            record.method = request.method
        else:
            record.url = '-'
            record.remote_addr = '-'
            record.method = '-'
        return super().format(record)


def setup_logging(app):
    """Configure logging based on LOG_MODE setting.
    
    Modes:
        MAX: Detailed logs with timestamps, modules, request info (DEBUG level)
        MIN: Minimal logs with level and message only (INFO level)
    """
    log_mode = app.config.get('LOG_MODE', 'MAX').upper()
    
    # Create logs directory
    log_dir = os.path.join(os.getcwd(), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Generate timestamped log filename
    timestamp = datetime.now().strftime('%Y_%j_%H%M%S')
    log_file = os.path.join(log_dir, f"{timestamp}.log")
    
    # Configure root logger
    root_logger = logging.getLogger()
    
    # Clear existing handlers
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    # Create handlers
    file_handler = logging.FileHandler(log_file, delay=True)
    console_handler = logging.StreamHandler(sys.stdout)
    
    if log_mode == 'MAX':
        # Detailed logging for debugging
        root_logger.setLevel(logging.DEBUG)
        file_handler.setLevel(logging.DEBUG)
        console_handler.setLevel(logging.DEBUG)
        
        # Detailed formatters with request context
        file_formatter = RequestFormatter(
            '[%(asctime)s] %(remote_addr)s %(method)s %(url)s\n'
            '%(levelname)s in %(module)s: %(message)s\n'
        )
        console_formatter = RequestFormatter(
            '%(asctime)s | %(levelname)s | %(module)s | %(message)s'
        )
        
    else:  # MIN (default fallback)
        # Minimal logging for production
        root_logger.setLevel(logging.INFO)
        file_handler.setLevel(logging.INFO)
        console_handler.setLevel(logging.INFO)
        
        # Simple formatters
        file_formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s: %(message)s'
        )
        console_formatter = logging.Formatter(
            '%(levelname)s: %(message)s'
        )
    
    # Apply formatters
    file_handler.setFormatter(file_formatter)
    console_handler.setFormatter(console_formatter)
    
    # Add handlers
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Unify werkzeug logging
    logging.getLogger('werkzeug').handlers = root_logger.handlers
    
    app.logger.info(f"Logging initialized [{log_mode}] -> {log_file}")
