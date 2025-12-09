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
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT l.id, l.laboratory_id, l.account_id, l.target_type, l.target_id, l.action_type, l.summary, l.changes, l.created_at,
               a.name as user_name, lab.name as laboratory_name
        FROM laboratory_activity_logs l
        JOIN accounts a ON l.account_id = a.id
        JOIN laboratories lab ON l.laboratory_id = lab.id
        WHERE 1=1
        AND (
            NOT (l.target_type = 'component' AND l.action_type = 'update')
            OR NOT EXISTS (
                SELECT 1 FROM laboratory_activity_logs l2
                WHERE l2.target_id = l.target_id
                AND l2.target_type = 'component'
                AND l2.action_type = 'update'
                AND l2.created_at > l.created_at
            )
        )
    """
    params = []
    
    if laboratory_id:
        query += " AND l.laboratory_id = %s"
        params.append(laboratory_id)
        
    if action_type:
        query += " AND l.action_type = %s"
        params.append(action_type)

    if target_type:
        query += " AND l.target_type = %s"
        params.append(target_type)
        
    query += " ORDER BY l.created_at DESC LIMIT 100"
    
    cursor.execute(query, tuple(params))
    activities = cursor.fetchall()
    cursor.close()
    
    return jsonify(activities), 200
