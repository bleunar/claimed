from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from utilities.decorators import role_required
from core.database import get_db

activities_bp = Blueprint('activities', __name__, url_prefix='/activities')

@activities_bp.route('/', methods=['GET'])
@jwt_required()
def list_activities():
    laboratory_id = request.args.get('laboratory_id')
    action_type = request.args.get('action_type')
    target_type = request.args.get('target_type')
    show_all = request.args.get('show_all', 'false').lower() == 'true'
    pending_only = request.args.get('pending_only', 'false').lower() == 'true'
    
    db = get_db()
    cursor = db.cursor(dictionary=True)

    # Updated query for new schema
    query = """
        SELECT l.id, l.lab_target_id, l.account_id, l.action_type, l.summary, l.metadata, l.created_at,
               l.set_target_id, l.comp_target_id, l.email_notification_status,
               a.name as user_name, lab.name as laboratory_name
        FROM laboratory_activity l
        JOIN accounts a ON l.account_id = a.id
        LEFT JOIN laboratories lab ON l.lab_target_id = lab.id
        WHERE 1=1
    """
    params = []

    if pending_only:
        query += " AND l.email_notification_status = 'pending'"

    if not show_all and not pending_only:
        # Filter: For 'update' actions on Components/Sets, show only the latest one.
        # Implemented by excluding rows where a NEWER row exists with same target and action='update'.
        query += """
        AND (
            -- Component Updates: Show only if no newer update exists for this component
            (
                NOT (l.comp_target_id IS NOT NULL AND l.action_type = 'update')
                OR NOT EXISTS (
                    SELECT 1 FROM laboratory_activity l2
                    WHERE l2.comp_target_id = l.comp_target_id
                    AND l2.comp_target_id IS NOT NULL
                    AND l2.action_type = 'update'
                    AND l2.created_at > l.created_at
                )
            )
            AND
            -- Computer Set Updates: Show only if no newer update exists for this set
            (
                NOT (l.set_target_id IS NOT NULL AND l.action_type = 'update')
                OR NOT EXISTS (
                    SELECT 1 FROM laboratory_activity l3
                    WHERE l3.set_target_id = l.set_target_id
                    AND l3.set_target_id IS NOT NULL
                    AND l3.action_type = 'update'
                    AND l3.created_at > l.created_at
                )
            )
        )
        """
    
    if laboratory_id:
        query += " AND l.lab_target_id = %s"
        params.append(laboratory_id)
        
    if action_type:
        query += " AND l.action_type = %s"
        params.append(action_type)

    if target_type:
        if target_type == 'component':
            query += " AND l.comp_target_id IS NOT NULL"
        elif target_type == 'computer_set':
            query += " AND l.set_target_id IS NOT NULL"
        elif target_type == 'laboratory':
             # Assuming lab level logs don't have set/comp target
            query += " AND l.set_target_id IS NULL AND l.comp_target_id IS NULL"
        
    query += " ORDER BY l.created_at DESC LIMIT 100"
    
    cursor.execute(query, tuple(params))
    activities = cursor.fetchall()
    
    # Post-process to add 'target_type' and 'target_id' fields for frontend compatibility
    for act in activities:
        if act['comp_target_id']:
            act['target_type'] = 'component'
            act['target_id'] = act['comp_target_id']
        elif act['set_target_id']:
            act['target_type'] = 'computer_set'
            act['target_id'] = act['set_target_id']
        else:
            act['target_type'] = 'laboratory'
            act['target_id'] = act['lab_target_id']
            
    cursor.close()
    
    return jsonify(activities), 200


@activities_bp.route('/report', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def send_activity_report():
    from utilities.email_sender import send_email
    from flask import render_template
    import json
    from datetime import datetime

    db = get_db()
    cursor = db.cursor(dictionary=True)

    # 1. Fetch Recipients (Admin, IT Head, Lab Head)
    cursor.execute("SELECT email FROM accounts WHERE role IN ('admin', 'it_head', 'lab_head') AND status != 'deleted'")
    recipients = [row['email'] for row in cursor.fetchall()]
    
    if not recipients:
         cursor.close()
         return jsonify({"msg": "No recipients found"}), 400

    # 2. Fetch Pending Activities
    query = """
        SELECT l.id, l.lab_target_id, l.action_type, l.summary, l.metadata, l.created_at,
               l.set_target_id, l.comp_target_id,
               a.name as user_name
        FROM laboratory_activity l
        JOIN accounts a ON l.account_id = a.id
        WHERE l.email_notification_status = 'pending'
        ORDER BY l.created_at DESC
        LIMIT 500
    """
    cursor.execute(query)
    activities = cursor.fetchall()

    if not activities:
        cursor.close()
        return jsonify({"msg": "No pending activities to report"}), 400

    # 3. Group Data: Date -> Lab -> Set
    grouped_data = {}
    activity_ids = []

    for log in activities:
        activity_ids.append(log['id'])
        # Parse Metadata
        try:
            meta = json.loads(log['metadata']) if isinstance(log['metadata'], str) else log['metadata']
        except:
            meta = {}
        
        snapshot = meta.get('snapshot', {}).get('target', {})
        
        # Keys
        date_key = log['created_at'].strftime('%Y-%m-%d')
        lab_key = snapshot.get('laboratory', {}).get('name') or "General Laboratory"
        set_key = snapshot.get('computer_set', {}).get('name') or "General Activities"

        if date_key not in grouped_data:
            grouped_data[date_key] = {}
        if lab_key not in grouped_data[date_key]:
            grouped_data[date_key][lab_key] = {}
        if set_key not in grouped_data[date_key][lab_key]:
            grouped_data[date_key][lab_key][set_key] = []
            
        # Extract "Current Value" of changes if update
        changes_display = ""
        changes = meta.get('changes', {})
        if changes:
             parts = []
             for field, val in changes.items():
                 # val might be {previous: x, current: y} or just val
                 curr = val.get('current') if isinstance(val, dict) and 'current' in val else val
                 parts.append(f"{field}: {curr}")
             changes_display = ", ".join(parts)
        
        log_entry = {
            'time': log['created_at'].strftime('%H:%M:%S'),
            'user': log['user_name'],
            'summary': log['summary'],
            'changes': changes_display
        }
        grouped_data[date_key][lab_key][set_key].append(log_entry)

    # 4. Generate HTML using Template
    final_html = render_template('activity_report.html', 
                               grouped_data=grouped_data, 
                               generation_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    # 5. Send Email
    success = send_email(recipients, f"Activity Report - {datetime.now().strftime('%Y-%m-%d')}", final_html)
    
    if success:
        # 6. Update DB Status
        if activity_ids:
            format_ids = ','.join(['%s'] * len(activity_ids))
            update_query = f"UPDATE laboratory_activity SET email_notification_status = 'sent', email_sent_at = NOW() WHERE id IN ({format_ids})"
            cursor.execute(update_query, tuple(activity_ids))
            db.commit()
            
        cursor.close()
        return jsonify({"msg": "Report sent and activities marked as sent"}), 200
    else:
        cursor.close()
        return jsonify({"msg": "Failed to send email"}), 500

@activities_bp.route('/status', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'it_head'])
def batch_update_activity_status():
    data = request.json
    ids = data.get('ids', [])
    status = data.get('status')
    
    if not ids or not status:
        return jsonify({"msg": "IDs and Status are required"}), 400
        
    allowed_statuses = ['pending', 'sent', 'skipped']
    if status not in allowed_statuses:
        return jsonify({"msg": f"Invalid status. Allowed: {', '.join(allowed_statuses)}"}), 400

    db = get_db()
    cursor = db.cursor()
    
    try:
        format_ids = ','.join(['%s'] * len(ids))
        query = f"UPDATE laboratory_activity SET email_notification_status = %s WHERE id IN ({format_ids})"
        
        cursor.execute(query, (status, *ids))
        db.commit()
        cursor.close()
        return jsonify({"msg": f"Updated {len(ids)} activities to {status}"}), 200
    except Exception as e:
        db.rollback()
        cursor.close()
        return jsonify({"msg": f"Failed to update activities: {str(e)}"}), 500
