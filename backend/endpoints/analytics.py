from flask import Blueprint, jsonify
from core.database import get_db

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics/kpi', methods=['GET'])
def get_kpi_data():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) as count FROM accounts")
        total_users = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM laboratories")
        total_labs = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM computer_sets")
        total_computers = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM computer_sets WHERE status = 'maintenance'")
        maintenance_alerts = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM computer_set_components")
        total_components = cursor.fetchone()['count']

        return jsonify({
            "total_users": total_users,
            "total_labs": total_labs,
            "total_computers": total_computers,
            "maintenance_alerts": maintenance_alerts,
            "total_components": total_components
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/analytics/bar/computers-by-lab', methods=['GET'])
def get_computers_by_lab():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT l.name as labels, COUNT(cs.id) as data 
            FROM laboratories l
            LEFT JOIN computer_sets cs ON l.id = cs.laboratory_id
            GROUP BY l.id, l.name
        """)
        results = cursor.fetchall()
        
        # Format for Chart.js
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/analytics/pie/computers-by-status', methods=['GET'])
def get_computers_by_status():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT status as labels, COUNT(*) as data 
            FROM computer_sets 
            GROUP BY status
        """)
        results = cursor.fetchall()
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/analytics/pie/components-by-status', methods=['GET'])
def get_components_by_status():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT status as labels, COUNT(*) as data 
            FROM computer_set_components 
            GROUP BY status
        """)
        results = cursor.fetchall()
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
