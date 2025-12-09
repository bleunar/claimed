from flask import Blueprint, jsonify
from core.database import get_db

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics/dashboard', methods=['GET'])
def get_dashboard_data():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1. KPIs
        # Total Users
        cursor.execute("SELECT COUNT(*) as count FROM accounts")
        total_users = cursor.fetchone()['count']

        # Total Labs
        cursor.execute("SELECT COUNT(*) as count FROM laboratories")
        total_labs = cursor.fetchone()['count']

        # Total Computer Sets
        cursor.execute("SELECT COUNT(*) as count FROM computer_sets")
        total_computers = cursor.fetchone()['count']

        # Maintenance Alerts (Computer Sets)
        cursor.execute("SELECT COUNT(*) as count FROM computer_sets WHERE status = 'maintenance'")
        maintenance_alerts = cursor.fetchone()['count']

        # Total Components
        cursor.execute("SELECT COUNT(*) as count FROM computer_set_components")
        total_components = cursor.fetchone()['count']

        # 2. Charts Data

        # Computers per Lab
        cursor.execute("""
            SELECT l.name, COUNT(cs.id) as count 
            FROM laboratories l
            LEFT JOIN computer_sets cs ON l.id = cs.laboratory_id
            GROUP BY l.id, l.name
        """)
        computers_by_lab = cursor.fetchall()

        # Computers by Status
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM computer_sets 
            GROUP BY status
        """)
        computers_by_status = cursor.fetchall()

        # Components by Status
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM computer_set_components 
            GROUP BY status
        """)
        components_by_status = cursor.fetchall()

        return jsonify({
            "kpis": {
                "total_users": total_users,
                "total_labs": total_labs,
                "total_computers": total_computers,
                "maintenance_alerts": maintenance_alerts,
                "total_components": total_components
            },
            "charts": {
                "computers_by_lab": computers_by_lab,
                "computers_by_status": computers_by_status,
                "components_by_status": components_by_status
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
