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
        # Get all laboratories
        cursor.execute("SELECT id, name FROM laboratories ORDER BY name")
        labs = cursor.fetchall()
        
        # Get computer counts grouped by laboratory and status
        cursor.execute("""
            SELECT l.id as lab_id, l.name as lab_name, cs.status, COUNT(cs.id) as count
            FROM laboratories l
            LEFT JOIN computer_sets cs ON l.id = cs.laboratory_id
            GROUP BY l.id, l.name, cs.status
            ORDER BY l.name
        """)
        results = cursor.fetchall()
        
        # Build data structure for stacked bar chart
        labels = [lab['name'] for lab in labs]
        
        # Initialize status counts per lab (active = available + in_use)
        lab_status_map = {lab['id']: {'active': 0, 'maintenance': 0} for lab in labs}
        
        # Populate counts
        for row in results:
            if row['status'] and row['lab_id'] in lab_status_map:
                if row['status'] == 'maintenance':
                    lab_status_map[row['lab_id']]['maintenance'] = row['count']
                else:
                    # Combine available and in_use into active
                    lab_status_map[row['lab_id']]['active'] += row['count']
        
        # Create datasets for each status
        datasets = [
            {
                'label': 'Active',
                'data': [lab_status_map[lab['id']]['active'] for lab in labs],
                'backgroundColor': 'rgba(40, 167, 69, 0.7)',
                'borderColor': 'rgba(40, 167, 69, 1)',
                'borderWidth': 1
            },
            {
                'label': 'Maintenance',
                'data': [lab_status_map[lab['id']]['maintenance'] for lab in labs],
                'backgroundColor': 'rgba(255, 193, 7, 0.7)',
                'borderColor': 'rgba(255, 193, 7, 1)',
                'borderWidth': 1
            }
        ]
        
        return jsonify({
            'labels': labels,
            'datasets': datasets
        })
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
