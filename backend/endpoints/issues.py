from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.database import get_db
from utilities.activity_logger import log_activity
from utilities.decorators import role_required
import uuid
from datetime import datetime

issues_bp = Blueprint('issues', __name__, url_prefix='/issues')

@issues_bp.route('/', methods=['GET'])
@jwt_required()
def list_issues():
    laboratory_id = request.args.get('laboratory_id')
    status = request.args.get('status')
    priority = request.args.get('priority')
    tab = request.args.get('tab')
    date_filter = request.args.get('date_filter')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT i.*, 
               l.name as laboratory_name,
               cs.set_name as computer_set_name,
               c.brand_name as component_brand,
               fb.name as flagged_by_name,
               ab.name as acknowledged_by_name,
               rb.name as resolved_by_name
        FROM laboratory_issues i
        LEFT JOIN laboratories l ON i.laboratory_id = l.id
        LEFT JOIN computer_sets cs ON i.computer_set_id = cs.id
        LEFT JOIN computer_set_components c ON i.component_id = c.id
        LEFT JOIN accounts fb ON i.flagged_by = fb.id
        LEFT JOIN accounts ab ON i.acknowledged_by = ab.id
        LEFT JOIN accounts rb ON i.resolved_by = rb.id
        WHERE 1=1
    """
    params = []
    
    if tab == 'flags':
        query += " AND i.status = 'new'"
    elif tab == 'active':
        query += " AND i.status IN ('open', 'in_progress')"
    elif tab == 'closed':
        query += " AND i.status IN ('resolved', 'closed', 'wont_fix')"
    
    if date_filter == 'today':
        query += " AND DATE(i.created_at) = CURDATE()"
    elif date_filter == 'week':
        query += " AND YEARWEEK(i.created_at, 1) = YEARWEEK(CURDATE(), 1)"
    elif date_filter == 'month':
        query += " AND MONTH(i.created_at) = MONTH(CURDATE()) AND YEAR(i.created_at) = YEAR(CURDATE())"
    
    if laboratory_id:
        query += " AND i.laboratory_id = %s"
        params.append(laboratory_id)
        
    # Note: Status filter removed/overridden if tab is used, but we keep it for backward compat or if no tab
    if status and not tab: 
        query += " AND i.status = %s"
        params.append(status)
        
    if priority:
        query += " AND i.priority = %s"
        params.append(priority)
        
    # Sort by Priority (Critical -> High -> Medium -> Low) then Date
    query += " ORDER BY FIELD(i.priority, 'critical', 'high', 'medium', 'low') ASC, i.created_at DESC"
    
    cursor.execute(query, tuple(params))
    issues = cursor.fetchall()
    cursor.close()
    
    return jsonify(issues), 200

@issues_bp.route('/', methods=['POST'])
@jwt_required()
def create_issue():
    current_user_id = get_jwt_identity()
    data = request.json
    
    laboratory_id = data.get('laboratory_id') or None
    computer_set_id = data.get('computer_set_id') or None
    component_id = data.get('component_id') or None
    title = data.get('title')
    description = data.get('description')
    priority = data.get('priority', 'medium')
    
    if not title or not description:
        return jsonify({"msg": "Title and Description are required"}), 400
        
    issue_id = uuid.uuid4().hex[:16]
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Auto-resolve context if component is provided but others are missing
    if component_id and (not computer_set_id or not laboratory_id):
        cursor.execute("""
            SELECT c.computer_set_id, cs.laboratory_id
            FROM computer_set_components c
            LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id
            WHERE c.id = %s
        """, (component_id,))
        context_res = cursor.fetchone()
        if context_res:
             if not computer_set_id: computer_set_id = context_res.get('computer_set_id')
             if not laboratory_id: laboratory_id = context_res.get('laboratory_id')

    # Auto-resolve laboratory_id if computer_set_id is present but laboratory_id is missing
    if computer_set_id and not laboratory_id:
        cursor.execute("SELECT laboratory_id FROM computer_sets WHERE id = %s", (computer_set_id,))
        set_res = cursor.fetchone()
        if set_res:
             laboratory_id = set_res.get('laboratory_id')

    # Validate computer_set_id existence to prevent FK errors
    if computer_set_id:
        cursor.execute("SELECT id FROM computer_sets WHERE id = %s", (computer_set_id,))
        if not cursor.fetchone():
            computer_set_id = None
    
    try:
        query = """
            INSERT INTO laboratory_issues 
            (id, laboratory_id, computer_set_id, component_id, flagged_by, title, description, priority, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'new')
        """
        cursor.execute(query, (
            issue_id, laboratory_id, computer_set_id, component_id, current_user_id, title, description, priority
        ))
        
        # Log activity with specific target context
        if laboratory_id:
             target_type = 'laboratory'
             target_id = laboratory_id
             summary = f"Reported issue: {title}"
             snapshot_ctx = {}
             
             if component_id:
                 target_type = 'component'
                 target_id = component_id
                 cursor.execute("""
                    SELECT c.brand_name, c.component_type, cs.set_name, cs.id as set_id, l.name as lab_name, cs.laboratory_id
                    FROM computer_set_components c 
                    LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id
                    LEFT JOIN laboratories l ON cs.laboratory_id = l.id
                    WHERE c.id = %s
                 """, (component_id,))
                 res = cursor.fetchone()
                 if res:
                     summary = f"Reported issue on component {res['brand_name']} ({res['set_name']}, {res['lab_name']}): {title}"
                     snapshot_ctx = {
                        "target": {
                            "component": {"id": component_id, "brand_name": res['brand_name'], "type": res['component_type']},
                            "computer_set": {"id": res['set_id'], "name": res['set_name']},
                            "laboratory": {"id": res['laboratory_id'], "name": res['lab_name']}
                        }
                     }
             elif computer_set_id:
                 target_type = 'computer_set'
                 target_id = computer_set_id
                 cursor.execute("""
                    SELECT cs.set_name, cs.laboratory_id, l.name as lab_name 
                    FROM computer_sets cs 
                    JOIN laboratories l ON cs.laboratory_id = l.id 
                    WHERE cs.id = %s
                 """, (computer_set_id,))
                 res = cursor.fetchone()
                 if res:
                     summary = f"Reported issue on computer set {res['set_name']} ({res['lab_name']}): {title}"
                     snapshot_ctx = {
                        "target": {
                            "computer_set": {"id": computer_set_id, "name": res['set_name']},
                            "laboratory": {"id": res['laboratory_id'], "name": res['lab_name']}
                        }
                     }

             log_activity(db, current_user_id, laboratory_id, target_type, target_id, 'create', summary, snapshot_context=snapshot_ctx)

        db.commit()
        cursor.close()
        return jsonify({"msg": "Issue reported successfully", "id": issue_id}), 201
        
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to report issue: {str(e)}"}), 500

@issues_bp.route('/<id>', methods=['PUT'])
@jwt_required()
def update_issue(id):
    current_user_id = get_jwt_identity()
    data = request.json
    
    status = data.get('status')
    resolution_notes = data.get('resolution_notes')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM laboratory_issues WHERE id = %s", (id,))
    issue = cursor.fetchone()
    
    if not issue:
        cursor.close()
        return jsonify({"msg": "Issue not found"}), 404
        
    fields = []
    values = []
    
    if status:
        fields.append("status = %s")
        values.append(status)
        
        # Handle status transitions
        if status in ['open', 'in_progress'] and not issue['acknowledged_by']:
            fields.append("acknowledged_by = %s")
            values.append(current_user_id)
            
        if status in ['resolved', 'closed', 'wont_fix']:
            fields.append("resolved_by = %s")
            values.append(current_user_id)
            fields.append("resolved_at = %s")
            values.append(datetime.now())

    if resolution_notes is not None:
        fields.append("resolution_notes = %s")
        values.append(resolution_notes)
        
    if not fields:
        return jsonify({"msg": "No changes provided"}), 400
        
    values.append(id)
    
    try:
        query = f"UPDATE laboratory_issues SET {', '.join(fields)} WHERE id = %s"
        cursor.execute(query, tuple(values))
        db.commit()
        cursor.close()
        return jsonify({"msg": "Issue updated successfully"}), 200
        
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to update issue: {str(e)}"}), 500
@issues_bp.route('/email', methods=['POST'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def send_issue_report():
    from utilities.email_sender import send_email
    from flask import render_template
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    data = request.json or {}
    issue_ids = data.get('issue_ids')
    recipient_ids = data.get('recipient_ids')
    
    if not issue_ids or not isinstance(issue_ids, list):
        cursor.close()
        return jsonify({"msg": "issue_ids must be a non-empty list"}), 400
        
    # 1. Fetch Recipients
    if recipient_ids:
        if not isinstance(recipient_ids, list):
             cursor.close()
             return jsonify({"msg": "recipient_ids must be a list"}), 400
             
        format_ids = ','.join(['%s'] * len(recipient_ids))
        cursor.execute(f"SELECT email FROM accounts WHERE id IN ({format_ids}) AND status != 'deleted'", tuple(recipient_ids))
        recipients = [row['email'] for row in cursor.fetchall()]
    else:
        # Default fallback if none selected (though frontend should enforce)
        cursor.close()
        return jsonify({"msg": "No recipients provided"}), 400

    if not recipients:
         cursor.close()
         return jsonify({"msg": "No valid recipients found"}), 400

    # 2. Fetch Selected Issues
    # Reusing the base query logic but filtering by specific IDs
    format_issue_ids = ','.join(['%s'] * len(issue_ids))
    query = f"""
        SELECT i.*, 
               l.name as laboratory_name,
               cs.set_name as computer_set_name,
               c.brand_name as component_brand,
               fb.name as flagged_by_name,
               ab.name as acknowledged_by_name,
               rb.name as resolved_by_name
        FROM laboratory_issues i
        LEFT JOIN laboratories l ON i.laboratory_id = l.id
        LEFT JOIN computer_sets cs ON i.computer_set_id = cs.id
        LEFT JOIN computer_set_components c ON i.component_id = c.id
        LEFT JOIN accounts fb ON i.flagged_by = fb.id
        LEFT JOIN accounts ab ON i.acknowledged_by = ab.id
        LEFT JOIN accounts rb ON i.resolved_by = rb.id
        WHERE i.id IN ({format_issue_ids})
        ORDER BY FIELD(i.priority, 'critical', 'high', 'medium', 'low') ASC, i.created_at DESC
    """
    
    cursor.execute(query, tuple(issue_ids))
    issues = cursor.fetchall()
    
    if not issues:
        cursor.close()
        return jsonify({"msg": "No issues found for the provided IDs"}), 404

    # 3. Generate HTML
    try:
        final_html = render_template('issue_report.html', 
                                   issues=issues, 
                                   generation_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to generate report template: {str(e)}"}), 500

    # 4. Send Email
    success = send_email(recipients, f"Laboratory Issues Report - {datetime.now().strftime('%Y-%m-%d')}", final_html)
    
    cursor.close()
    
    if success:
        return jsonify({"msg": "Issue report sent successfully"}), 200
    else:
        return jsonify({"msg": "Failed to send email"}), 500
@issues_bp.route('/batch', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def batch_update_issues():
    current_user_id = get_jwt_identity()
    data = request.json
    ids = data.get('ids', [])
    status = data.get('status')
    resolution_notes = data.get('resolution_notes')
    
    if not ids or not status:
        return jsonify({"msg": "IDs and Status are required"}), 400
        
    allowed_statuses = ['new', 'open', 'in_progress', 'resolved', 'closed', 'wont_fix']
    if status not in allowed_statuses:
        return jsonify({"msg": f"Invalid status. Allowed: {', '.join(allowed_statuses)}"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Pre-fetch issues for logging
        format_ids = ','.join(['%s'] * len(ids))
        cursor.execute(f"""
            SELECT i.id, i.title, i.laboratory_id, i.computer_set_id, i.component_id, 
                   l.name as lab_name, cs.set_name, c.brand_name, c.component_type
            FROM laboratory_issues i
            LEFT JOIN laboratories l ON i.laboratory_id = l.id
            LEFT JOIN computer_sets cs ON i.computer_set_id = cs.id
            LEFT JOIN computer_set_components c ON i.component_id = c.id
            WHERE i.id IN ({format_ids})
        """, tuple(ids))
        issues_to_update = cursor.fetchall()
        
        # Prepare Update Fields
        fields = ["status = %s"]
        values = [status]
        
        if status in ['open', 'in_progress']:
            fields.append("acknowledged_by = %s")
            values.append(current_user_id)
            
        if status in ['resolved', 'closed', 'wont_fix']:
            fields.append("resolved_by = %s")
            values.append(current_user_id)
            fields.append("resolved_at = NOW()")
            
        if resolution_notes is not None:
             fields.append("resolution_notes = %s")
             values.append(resolution_notes)
             
        # Execute Bulk Update
        # Note: We update all matching IDs. Simplification: this overwrites acknowledged_by even if already set, which aligns with "taking ownership" or "bulk action by current user".
        query = f"UPDATE laboratory_issues SET {', '.join(fields)} WHERE id IN ({format_ids})"
        cursor.execute(query, tuple(values + ids))
        
        # Log Activities
        for issue in issues_to_update:
             if issue['laboratory_id']:
                 summary = f"Batch updated issue status to '{status}': {issue['title']}"
                 
                 # Construct valid snapshot context
                 target_type = 'laboratory'
                 target_id = issue['laboratory_id']
                 
                 ctx_target = {"laboratory": {"id": issue['laboratory_id'], "name": issue['lab_name']}}
                 
                 if issue['component_id']:
                     target_type = 'component'
                     target_id = issue['component_id']
                     ctx_target["component"] = {"id": issue['component_id'], "brand_name": issue['brand_name'], "type": issue['component_type']}
                     if issue['computer_set_id']:
                         ctx_target["computer_set"] = {"id": issue['computer_set_id'], "name": issue['set_name']}
                         
                 elif issue['computer_set_id']:
                     target_type = 'computer_set'
                     target_id = issue['computer_set_id']
                     ctx_target["computer_set"] = {"id": issue['computer_set_id'], "name": issue['set_name']}

                 log_activity(
                     db, 
                     current_user_id, 
                     issue['laboratory_id'], 
                     target_type, 
                     target_id, 
                     'status_change', 
                     summary, 
                     changes={"status": {"previous": "various", "current": status}}, 
                     snapshot_context={"target": ctx_target}
                 )

        db.commit()
        cursor.close()
        return jsonify({"msg": f"Updated {len(ids)} issues to {status}"}), 200
        
    except Exception as e:
        db.rollback()
        cursor.close()
        return jsonify({"msg": f"Failed to batch update issues: {str(e)}"}), 500
