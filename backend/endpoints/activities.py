from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from core.database import get_db

activities_bp = Blueprint('activities', __name__, url_prefix='/activities')

@activities_bp.route('/', methods=['GET'])
@jwt_required()
def list_activities():
    laboratory_id = request.args.get('laboratory_id')
    action_type = request.args.get('action_type')
    target_type = request.args.get('target_type')
    show_all = request.args.get('show_all', 'false').lower() == 'true'
    
    db = get_db()
    cursor = db.cursor(dictionary=True)

    # Updated query for new schema
    # Note: 'changes' alias for 'metadata' to keep frontend compatible if it expects 'changes'
    query = """
        SELECT l.id, l.lab_target_id, l.account_id, l.action_type, l.summary, l.metadata as changes, l.created_at,
               l.set_target_id, l.comp_target_id,
               a.name as user_name, lab.name as laboratory_name
        FROM laboratory_activity l
        JOIN accounts a ON l.account_id = a.id
        LEFT JOIN laboratories lab ON l.lab_target_id = lab.id
        WHERE 1=1
    """
    
    if not show_all:
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
    params = []
    
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
