from core.instance import create_app
from core.database import init_app
from endpoints import register_blueprints
from core.startup import perform_startup_checks

from flask import send_from_directory
import os

app = create_app()
init_app(app)
register_blueprints(app)
perform_startup_checks(app)

# Ensure uploads directory exists
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'profile')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(os.path.join(os.getcwd(), 'uploads'), filename)

if __name__ == '__main__':
    app.run()
