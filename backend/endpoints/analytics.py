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
    from flask_jwt_extended import get_jwt, get_jwt_identity
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        current_claims = get_jwt()
        role = current_claims.get("role")
        user_id = get_jwt_identity()

        department_id = None
        if role in ['department_head', 'department_staff', 'department_assistant', 'lab_head', 'lab_assistant']:
            cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (user_id,))
            user_dept = cursor.fetchone()
            if user_dept:
                department_id = user_dept['department_id']

        # Helper to apply department filter
        def apply_dept_filter(query, table_alias=None, is_location_join_needed=False):
            if not department_id:
                return query, []
            
            filtered_query = query
            params = []
            
            if is_location_join_needed:
                # Assuming base query already joins or we need to add join
                # Simplified for the specific queries below
                pass
            
            return filtered_query, params

        # 1. Total Users
        users_query = "SELECT COUNT(*) as count FROM accounts WHERE deleted_at IS NULL"
        users_params = []
        if department_id:
            users_query += " AND department_id = %s"
            users_params.append(department_id)
        cursor.execute(users_query, users_params)
        total_users = cursor.fetchone()['count']

        # 2. Total Labs (Locations)
        labs_query = "SELECT COUNT(*) as count FROM locations WHERE type = 'laboratory'"
        labs_params = []
        if department_id:
            labs_query += " AND department_id = %s"
            labs_params.append(department_id)
        cursor.execute(labs_query, labs_params)
        total_labs = cursor.fetchone()['count']

        # 3. Total Computers
        comps_query = "SELECT COUNT(cs.id) as count FROM computer_sets cs"
        comps_params = []
        if department_id:
            comps_query += " JOIN locations l ON cs.location_id = l.id WHERE l.department_id = %s"
            comps_params.append(department_id)
        cursor.execute(comps_query, comps_params)
        total_computers = cursor.fetchone()['count']

        # 4. Maintenance Alerts (Computers)
        maint_query = "SELECT COUNT(cs.id) as count FROM computer_sets cs"
        maint_params = []
        where_clause = " WHERE cs.status = 'maintenance'"
        if department_id:
            maint_query += " JOIN locations l ON cs.location_id = l.id"
            where_clause += " AND l.department_id = %s"
            maint_params.append(department_id)
        maint_query += where_clause
        cursor.execute(maint_query, maint_params)
        maintenance_alerts = cursor.fetchone()['count']

        # 5. Total Components
        components_query = "SELECT COUNT(csc.id) as count FROM computer_set_components csc"
        components_params = []
        if department_id:
            components_query += " JOIN computer_sets cs ON csc.computer_set_id = cs.id JOIN locations l ON cs.location_id = l.id WHERE l.department_id = %s"
            components_params.append(department_id)
        cursor.execute(components_query, components_params)
        total_components = cursor.fetchone()['count']
        
        # 6. Components with issues
        issues_query = "SELECT COUNT(csc.id) as count FROM computer_set_components csc"
        issues_params = []
        where_clause = " WHERE csc.status IN ('bad', 'maintenance', 'missing')"
        if department_id:
            issues_query += " JOIN computer_sets cs ON csc.computer_set_id = cs.id JOIN locations l ON cs.location_id = l.id"
            where_clause += " AND l.department_id = %s"
            issues_params.append(department_id)
        issues_query += where_clause
        cursor.execute(issues_query, issues_params)
        components_with_issues = cursor.fetchone()['count']
        
        # 7. Active accounts
        active_query = "SELECT COUNT(*) as count FROM accounts WHERE suspended_at IS NULL AND deleted_at IS NULL"
        active_params = []
        if department_id:
             active_query += " AND department_id = %s"
             active_params.append(department_id)
        cursor.execute(active_query, active_params)
        active_accounts = cursor.fetchone()['count']
        
        # 8. Suspended accounts
        suspended_query = "SELECT COUNT(*) as count FROM accounts WHERE suspended_at IS NOT NULL AND deleted_at IS NULL"
        suspended_params = []
        if department_id:
             suspended_query += " AND department_id = %s"
             suspended_params.append(department_id)
        cursor.execute(suspended_query, suspended_params)
        suspended_accounts = cursor.fetchone()['count']
        
        # Online stats - keeping global for now as tracking logic is complex
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
    from flask_jwt_extended import get_jwt, get_jwt_identity
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        current_claims = get_jwt()
        role = current_claims.get("role")
        user_id = get_jwt_identity()
        
        # Determine department filter
        department_id = None
        if role in ['department_head', 'department_staff', 'department_assistant', 'lab_head', 'lab_assistant']:
            cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (user_id,))
            user_dept = cursor.fetchone()
            if user_dept:
                department_id = user_dept['department_id']

        # Get laboratories (filtered)
        lab_query = "SELECT id, name FROM locations WHERE type = 'laboratory'"
        lab_params = []
        if department_id:
             lab_query += " AND department_id = %s"
             lab_params.append(department_id)
        
        lab_query += " ORDER BY name"
        cursor.execute(lab_query, lab_params)
        labs = cursor.fetchall()

        if not labs:
             return jsonify({'labels': [], 'datasets': []})

        # Get computer counts grouped by location and status
        # We also need to filter the counts query to match the labs we selected
        stats_query = """
            SELECT l.id as lab_id, l.name as lab_name, cs.status, COUNT(cs.id) as count
            FROM locations l
            LEFT JOIN computer_sets cs ON l.id = cs.location_id
            WHERE l.type = 'laboratory'
        """
        stats_params = []
        if department_id:
             stats_query += " AND l.department_id = %s"
             stats_params.append(department_id)

        stats_query += " GROUP BY l.id, l.name, cs.status ORDER BY l.name"
        
        cursor.execute(stats_query, stats_params)
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
    from flask_jwt_extended import get_jwt, get_jwt_identity
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        current_claims = get_jwt()
        role = current_claims.get("role")
        user_id = get_jwt_identity()

        # Base query
        query = """
            SELECT cs.status as labels, COUNT(cs.id) as data 
            FROM computer_sets cs
            LEFT JOIN locations l ON cs.location_id = l.id
            WHERE 1=1
        """
        params = []

        # Role-based filtering
        if role in ['department_head', 'department_staff', 'department_assistant', 'lab_head', 'lab_assistant']:
            cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (user_id,))
            user_dept = cursor.fetchone()
            if user_dept and user_dept['department_id']:
                department_id = user_dept['department_id']
                query += " AND l.department_id = %s"
                params.append(department_id)
                
                # Additional filter for lab roles to only see laboratories
                if role in ['lab_head', 'lab_assistant']:
                     query += " AND l.type = 'laboratory'"
            else:
                 # If no department assigned, show nothing
                 pass 

        query += " GROUP BY cs.status"
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        return jsonify(results)
    except Exception as e:
        logger.exception("Failed to fetch computer status")
        return jsonify({"error": "Failed to fetch statistics"}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/analytics/pie/components-by-status', methods=['GET'])
@jwt_required()
def get_components_by_status():
    from flask_jwt_extended import get_jwt, get_jwt_identity
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        current_claims = get_jwt()
        role = current_claims.get("role")
        user_id = get_jwt_identity()

        # Base query
        query = """
            SELECT csc.status as labels, COUNT(csc.id) as data 
            FROM computer_set_components csc
            LEFT JOIN computer_sets cs ON csc.computer_set_id = cs.id
            LEFT JOIN locations l ON cs.location_id = l.id
            WHERE 1=1
        """
        params = []

        # Role-based filtering
        if role in ['department_head', 'department_staff', 'department_assistant', 'lab_head', 'lab_assistant']:
            cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (user_id,))
            user_dept = cursor.fetchone()
            if user_dept and user_dept['department_id']:
                department_id = user_dept['department_id']
                query += " AND l.department_id = %s"
                params.append(department_id)
                
                # Additional filter for lab roles to only see laboratories
                if role in ['lab_head', 'lab_assistant']:
                     query += " AND l.type = 'laboratory'"
            else:
                pass


        query += " GROUP BY csc.status"

        cursor.execute(query, params)
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

@analytics_bp.route('/analytics/recent-activities', methods=['GET'])
@jwt_required()
def get_recent_activities():
    """Get recent account activities (limit 5)
    
    Filtered by current user's role:
    - admin: all account activities
    - it_head: activities for it_head and it_technician roles
    - lab_head: activities for lab_head and lab_assistant roles
    - department_head: activities for department_head, department_staff, and department_assistant roles
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
        
        role_filter = None
        # Define role filters based on current user's role
        if current_role == 'admin':
            role_filter = None  # No filter, see all
        elif current_role == 'it_head':
            role_filter = ('it_head', 'it_technician')
        elif current_role == 'lab_head':
            role_filter = ('lab_head', 'lab_assistant')
        elif current_role == 'department_head':
            # Department Head manages generalized staff AND lab staff within their department
            role_filter = ('department_head', 'department_staff', 'department_assistant', 'lab_head', 'lab_assistant')
        else:
            return jsonify({"error": "Access denied"}), 403
        
        local_tz_offset = '+08:00'
        
        query = f"""
            SELECT 
                aa.action,
                aa.created_at as date,
                a.name as username,
                a.role,
                a.id as account_id,
                d.name as department_name
            FROM account_activities aa
            JOIN accounts a ON aa.account_id = a.id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE 1=1
        """
        params = []
        
        if role_filter:
            placeholders = ",".join(["%s"] * len(role_filter))
            query += f" AND a.role IN ({placeholders})"
            params.extend(role_filter)

        # Apply Department Filter for Heads
        if current_role in ['it_head', 'lab_head', 'department_head']:
            cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (identity,))
            user_dept = cursor.fetchone()
            if user_dept and user_dept['department_id']:
                query += " AND a.department_id = %s"
                params.append(user_dept['department_id'])
            
        query += " ORDER BY aa.created_at DESC LIMIT 10"
        
        cursor.execute(query, params)
        activities = cursor.fetchall()
        
        return jsonify(activities)
    except Exception as e:
        logger.exception("Failed to fetch recent activities")
        return jsonify({"error": "Failed to fetch recent activities"}), 500
    finally:
        cursor.close()
        conn.close()
