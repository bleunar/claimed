from flask import Blueprint, jsonify
from core.database import get_db
from utilities.activity_tracker import activity_tracker
import logging
from flask_jwt_extended import jwt_required


logger = logging.getLogger(__name__)

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics/kpi', methods=['GET'])
@jwt_required()
def get_kpi_data():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) as count FROM accounts WHERE deleted_at IS NULL")
        total_users = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM laboratories")
        total_labs = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM computer_sets")
        total_computers = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM computer_sets WHERE status = 'maintenance'")
        maintenance_alerts = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM computer_set_components")
        total_components = cursor.fetchone()['count']
        
        # Components with issues (bad, maintenance, missing)
        cursor.execute("""
            SELECT COUNT(*) as count FROM computer_set_components 
            WHERE status IN ('bad', 'maintenance', 'missing')
        """)
        components_with_issues = cursor.fetchone()['count']
        
        # Active accounts (not suspended and not deleted)
        cursor.execute("""
            SELECT COUNT(*) as count FROM accounts 
            WHERE suspended_at IS NULL AND deleted_at IS NULL
        """)
        active_accounts = cursor.fetchone()['count']
        
        # Suspended accounts
        cursor.execute("""
            SELECT COUNT(*) as count FROM accounts 
            WHERE suspended_at IS NOT NULL AND deleted_at IS NULL
        """)
        suspended_accounts = cursor.fetchone()['count']
        
        # Online accounts and devices (from activity tracker)
        online_accounts = activity_tracker.get_online_count()
        online_devices = activity_tracker.get_online_device_count()

        return jsonify({
            "total_users": total_users,
            "total_labs": total_labs,
            "total_computers": total_computers,
            "maintenance_alerts": maintenance_alerts,
            "total_components": total_components,
            "components_with_issues": components_with_issues,
            "active_accounts": active_accounts,
            "suspended_accounts": suspended_accounts,
            "online_accounts": online_accounts,
            "online_devices": online_devices
        })
    except Exception as e:
        logger.exception("Failed to fetch KPI data")
        return jsonify({"error": "Failed to fetch KPI data"}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/analytics/bar/computers-by-lab', methods=['GET'])
@jwt_required()
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
            },
            {
                'label': 'Maintenance',
                'data': [lab_status_map[lab['id']]['maintenance'] for lab in labs],
                'backgroundColor': 'rgba(255, 193, 7, 0.7)',
            }
        ]
        
        return jsonify({
            'labels': labels,
            'datasets': datasets
        })
    except Exception as e:
        logger.exception("Failed to fetch computers by lab")
        return jsonify({"error": "Failed to fetch activity logs"}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/analytics/pie/computers-by-status', methods=['GET'])
@jwt_required()
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
        logger.exception("Failed to fetch component types")
        return jsonify({"error": "Failed to send activity report"}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/analytics/pie/components-by-status', methods=['GET'])
@jwt_required()
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
        logger.exception("Failed to fetch component status")
        return jsonify({"error": "Failed to fetch statistics"}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/analytics/line/weekly-activities', methods=['GET'])
@jwt_required()
def get_weekly_activities():
    """Get account activities for the current week (Monday to Saturday)
    
    Filtered by current user's role:
    - admin: all account activities
    - it_head: activities for it_head and it_technician roles
    - lab_head: activities for lab_head and lab_assistant roles
    """
    from flask_jwt_extended import get_jwt_identity
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get current user's role
        identity = get_jwt_identity()
        cursor.execute("SELECT role FROM accounts WHERE id = %s", (identity,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        current_role = user['role']
        
        # Define role filters based on current user's role
        if current_role == 'admin':
            role_filter = None  # No filter, see all
        elif current_role == 'it_head':
            role_filter = ('it_head', 'it_technician')
        elif current_role == 'lab_head':
            role_filter = ('lab_head', 'lab_assistant')
        else:
            # Non-head roles shouldn't access this endpoint
            return jsonify({"error": "Access denied"}), 403
        
        # Build query for past 7 days (including today)
        # Note: Activities are stored in UTC, convert to local timezone (UTC+8) for accurate day grouping
        local_tz_offset = '+08:00'  # Asia/Manila timezone
        
        if role_filter:
            cursor.execute(f"""
                SELECT 
                    DATE(CONVERT_TZ(aa.created_at, '+00:00', '{local_tz_offset}')) as activity_date,
                    COUNT(*) as count
                FROM account_activities aa
                JOIN accounts a ON aa.account_id = a.id
                WHERE 
                    DATE(CONVERT_TZ(aa.created_at, '+00:00', '{local_tz_offset}')) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                    AND a.role IN (%s, %s)
                GROUP BY activity_date
                ORDER BY activity_date
            """, role_filter)
        else:
            cursor.execute(f"""
                SELECT 
                    DATE(CONVERT_TZ(created_at, '+00:00', '{local_tz_offset}')) as activity_date,
                    COUNT(*) as count
                FROM account_activities
                WHERE 
                    DATE(CONVERT_TZ(created_at, '+00:00', '{local_tz_offset}')) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                GROUP BY activity_date
                ORDER BY activity_date
            """)
        
        results = cursor.fetchall()
        
        # Create a complete 7-day structure (past 7 days including today)
        from datetime import datetime, timedelta
        today = datetime.now()
        date_labels = [(today - timedelta(days=6-i)).strftime('%b %d') for i in range(7)]
        date_keys = [(today - timedelta(days=6-i)).strftime('%Y-%m-%d') for i in range(7)]
        
        date_map = {str(row['activity_date']): row['count'] for row in results}
        
        # Format for line chart (labels/data format)
        chart_data = [
            {'labels': date_labels[i], 'data': date_map.get(date_keys[i], 0)}
            for i in range(7)
        ]
        
        return jsonify(chart_data)
    except Exception as e:
        logger.exception("Failed to fetch weekly activities")
        return jsonify({"error": "Failed to fetch weekly activities"}), 500
    finally:
        cursor.close()
        conn.close()
