"""System logging configuration with request/response logging."""
import logging
import os
import sys
import time
import traceback
from datetime import datetime
from flask import has_request_context, request, g


class RequestFormatter(logging.Formatter):
    """Formatter that includes request context when available."""
    
    def format(self, record):
        if has_request_context():
            record.url = request.url
            record.remote_addr = request.headers.get('X-Forwarded-For', request.remote_addr)
            record.method = request.method
        else:
            record.url = '-'
            record.remote_addr = '-'
            record.method = '-'
        return super().format(record)


def setup_logging(app):
    """Configure logging with request/response and error logging.
    
    Features:
        - Logs every request with status code, IP, method, path, and duration
        - Detailed exception logging with stack traces
        - Console output for both development and production
        - File logging with timestamped filenames
    """
    log_mode = app.config.get('LOG_MODE', 'MAX').upper()
    is_production = app.config.get('APP_ENV', 'development') == 'production'
    
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
        
    else:  # MIN mode for production
        root_logger.setLevel(logging.INFO)
        file_handler.setLevel(logging.INFO)
        console_handler.setLevel(logging.INFO)
        
        # Simple formatters
        file_formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s: %(message)s'
        )
        console_formatter = logging.Formatter(
            '%(asctime)s | %(levelname)s | %(message)s'
        )
    
    # Apply formatters
    file_handler.setFormatter(file_formatter)
    console_handler.setFormatter(console_formatter)
    
    # Add handlers
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Suppress werkzeug's default logging (we'll handle it ourselves)
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    
    # ==========================================
    # Request/Response Logging Middleware
    # ==========================================
    
    @app.before_request
    def log_request_start():
        """Record request start time."""
        g.request_start_time = time.time()
    
    @app.after_request
    def log_request_end(response):
        """Log every request with status, IP, method, path, and duration."""
        duration = 0
        if hasattr(g, 'request_start_time'):
            duration = (time.time() - g.request_start_time) * 1000  # Convert to ms
        
        # Get real IP (handle proxied requests)
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
        
        # Determine log level based on status code
        status = response.status_code
        if status >= 500:
            log_level = logging.ERROR
        elif status >= 400:
            log_level = logging.WARNING
        else:
            log_level = logging.INFO
        
        # Format: [STATUS] METHOD /path - IP - DURATIONms
        log_message = f"[{status}] {request.method} {request.path} - {ip} - {duration:.0f}ms"
        
        # Add query params hint if present (but not the actual values for security)
        if request.query_string:
            log_message += " (?...)"
        
        app.logger.log(log_level, log_message)
        
        return response
    
    # ==========================================
    # Exception/Error Logging
    # ==========================================
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Log detailed exception info with stack trace."""
        # Get real IP
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
        
        # Build detailed error log
        error_details = [
            "=" * 50,
            "UNHANDLED EXCEPTION",
            "=" * 50,
            f"Time: {datetime.now().isoformat()}",
            f"IP: {ip}",
            f"Method: {request.method}",
            f"Path: {request.path}",
            f"URL: {request.url}",
            f"Exception: {type(e).__name__}: {str(e)}",
            "-" * 50,
            "Stack Trace:",
            traceback.format_exc(),
            "=" * 50,
        ]
        
        app.logger.error("\n".join(error_details))
        
        # Re-raise to let Flask handle the response
        # (or return a generic error response)
        from flask import jsonify
        return jsonify({"msg": "An unexpected error occurred. Please try again."}), 500
    
    app.logger.info(f"Logging initialized [{log_mode}] -> {log_file}")
    app.logger.info(f"Environment: {'production' if is_production else 'development'}")

