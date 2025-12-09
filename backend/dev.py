from core.instance import create_app
from core.database import init_app
from endpoints import register_blueprints
from core.startup import perform_startup_checks

app = create_app()
init_app(app)
register_blueprints(app)
perform_startup_checks(app)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
