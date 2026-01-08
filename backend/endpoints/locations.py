from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from core.database import get_db
from utilities.decorators import role_required, verify_role_freshness
import logging
import uuid

logger = logging.getLogger(__name__)

locations_bp = Blueprint('locations', __name__, url_prefix='/locations')

@locations_bp.route('/', methods=['GET'])
@jwt_required()
def list_locations():
    """List all locations, optionally filtered by type, department, and search term"""
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    current_user_id = get_jwt_identity()

    location_type = request.args.get('type')
    department_id = request.args.get('department_id')
    search = request.args.get('search', '').strip()
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT l.id, l.name, l.description, l.type, l.department_id, 
               d.name as department_name, d.description as department_description, l.created_at, l.updated_at,
               COUNT(cs.id) as computer_set_count
        FROM locations l
        LEFT JOIN departments d ON l.department_id = d.id
        LEFT JOIN computer_sets cs ON l.id = cs.location_id AND cs.status != 'condemned' 
    """
    conditions = []
    params = []
    
    # RBAC & Department Enforcement
    restricted_roles = ['department_head', 'department_staff', 'department_assistant', 'lab_head', 'lab_assistant']
    
    # If user is in a restricted role, force filtering by their department
    if current_role in restricted_roles:
         cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_user_id,))
         user_dept = cursor.fetchone()
         user_department_id = user_dept['department_id'] if user_dept else 'non_existent'
         department_id = user_department_id
         
    if location_type:
        conditions.append("l.type = %s")
        params.append(location_type)
    
    if department_id:
        conditions.append("l.department_id = %s")
        params.append(department_id)
    
    if search:
        conditions.append("(l.name LIKE %s OR l.description LIKE %s)")
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern])
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    query += " GROUP BY l.id ORDER BY l.name"
    cursor.execute(query, params)
    locations = cursor.fetchall()
    cursor.close()
    return jsonify(locations), 200

@locations_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_location(id):
    """Get a single location by ID"""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT l.id, l.name, l.description, l.type, l.department_id,
               d.name as department_name, l.created_at, l.updated_at,
               COUNT(cs.id) as computer_set_count
        FROM locations l
        LEFT JOIN departments d ON l.department_id = d.id
        LEFT JOIN computer_sets cs ON l.id = cs.location_id AND cs.status != 'condemned'
        WHERE l.id = %s
        GROUP BY l.id
    """, (id,))
    location = cursor.fetchone()
    cursor.close()
    
    if not location:
        return jsonify({"msg": "Location not found"}), 404
        
    return jsonify(location), 200

@locations_bp.route('/', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head'])
def create_location():
    """Create a new location"""
    data = request.json
    name = data.get('name')
    description = data.get('description')
    location_type = data.get('type', 'laboratory')  # Default to laboratory
    department_id = data.get('department_id')  # Optional department association

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    # Validate type
    valid_types = ['office', 'laboratory', 'kiosk', 'others']
    if location_type not in valid_types:
        return jsonify({"msg": f"Invalid type. Must be one of: {', '.join(valid_types)}"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)

    # Check for duplicate name
    cursor.execute("SELECT id FROM locations WHERE name = %s", (name,))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Location name already exists"}), 409
    
    # Validate department_id if provided
    if department_id:
        cursor.execute("SELECT id FROM departments WHERE id = %s", (department_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Department not found"}), 404
    
    try:
        loc_id = uuid.uuid4().hex[:16]
        cursor.execute(
            "INSERT INTO locations (id, name, description, type, department_id) VALUES (%s, %s, %s, %s, %s)",
            (loc_id, name, description, location_type, department_id)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Location created successfully", "id": loc_id}), 201
    except Exception as e:
        logger.exception("Failed to create location")
        cursor.close()
        return jsonify({"msg": "Failed to create location. Please try again."}), 500

@locations_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'department_head', 'lab_head'])
def update_location(id: str):
    """Update a location"""
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    current_user_id = get_jwt_identity()
    
    data = request.json
    name = data.get('name', '')
    description = data.get('description', '')
    location_type = data.get('type')
    department_id = data.get('department_id')  # Can be None to unassign

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    # Validate type if provided
    if location_type:
        valid_types = ['office', 'laboratory', 'kiosk', 'others']
        if location_type not in valid_types:
            return jsonify({"msg": f"Invalid type. Must be one of: {', '.join(valid_types)}"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id, name, description, type, department_id FROM locations WHERE id = %s", (id,))
    existing_loc = cursor.fetchone()
    if not existing_loc:
        cursor.close()
        return jsonify({"msg": "Location not found"}), 404

    # RBAC: Department/Lab heads can only edit locations in their department
    if current_role in ['department_head', 'lab_head']:
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_user_id,))
        user_dept = cursor.fetchone()
        if not user_dept or user_dept['department_id'] != existing_loc['department_id']:
            cursor.close()
            return jsonify({"msg": "Access Denied: You can only edit locations in your department"}), 403
        
        # Department head: can only edit name and description
        # Lab head: can edit name, description, and type
        if current_role == 'department_head':
            location_type = existing_loc['type']
        elif not location_type:
            location_type = existing_loc['type']
        
        # Neither can change department
        department_id = existing_loc['department_id']
    else:
        # Admin/IT Head - Use existing type if not provided
        if not location_type:
            location_type = existing_loc['type']
        
        # Use existing department_id if not provided in request
        if 'department_id' not in data:
            department_id = existing_loc['department_id']
    
    # Validate department_id if provided and not null
    if department_id:
        cursor.execute("SELECT id FROM departments WHERE id = %s", (department_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Department not found"}), 404

    try:
        cursor.execute(
            "UPDATE locations SET name = %s, description = %s, type = %s, department_id = %s WHERE id = %s",
            (name, description, location_type, department_id, id)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Location updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update location")
        cursor.close()
        return jsonify({"msg": "Failed to update location. Please try again."}), 500

@locations_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head'])
def delete_location(id):
    """Delete a location. Computer sets in this location will be deleted (CASCADE)."""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id FROM locations WHERE id = %s", (id,))
    if not cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Location not found"}), 404

    try:
        cursor.execute("DELETE FROM locations WHERE id = %s", (id,))
        db.commit()
        cursor.close()
        return jsonify({"msg": "Location deleted successfully"}), 200
    except Exception as e:
        logger.exception("Failed to delete location")
        cursor.close()
        return jsonify({"msg": "Failed to delete location. Please try again."}), 500
