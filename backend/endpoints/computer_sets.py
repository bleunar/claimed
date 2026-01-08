from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from core.database import get_db
from utilities.decorators import role_required, verify_role_freshness
import logging
import uuid

logger = logging.getLogger(__name__)

computer_sets_bp = Blueprint('computer_sets', __name__, url_prefix='/computer-sets')

@computer_sets_bp.route('/', methods=['GET'])
@jwt_required()
def list_computer_sets():
    location_id = request.args.get('location_id')
    # Support legacy parameter name for backward compatibility
    if not location_id:
        location_id = request.args.get('laboratory_id')
    search = request.args.get('search')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = "SELECT id, location_id, set_name, status, created_at, updated_at FROM computer_sets WHERE 1=1"
    params = []
    
    if location_id:
        query += " AND location_id = %s"
        params.append(location_id)
        
    if search:
        query += " AND set_name LIKE %s"
        params.append(f"%{search}%")
        
    cursor.execute(query, tuple(params))
    computer_sets = cursor.fetchall()
    cursor.close()
    return jsonify(computer_sets), 200

@computer_sets_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_computer_set(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, location_id, set_name, status, created_at, updated_at FROM computer_sets WHERE id = %s", (id,))
    computer_set = cursor.fetchone()
    cursor.close()
    
    if not computer_set:
        return jsonify({"msg": "Computer set not found"}), 404
        
    return jsonify(computer_set), 200

@computer_sets_bp.route('/', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head'])
def create_computer_set():
    data = request.json
    location_id = data.get('location_id') or data.get('laboratory_id')  # Support legacy
    
    # Check for batch config
    batch_config = data.get('batch_config')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Verify location exists and get name for log context
    cursor.execute("SELECT id, name, department_id FROM locations WHERE id = %s", (location_id,))
    loc_data = cursor.fetchone()
    if not loc_data:
        cursor.close()
        return jsonify({"msg": "Location not found"}), 404

    try:
        if batch_config:
            # Batch Creation
            prefix = batch_config.get('prefix', 'PC-')
            start_number = int(batch_config.get('start_number', 1))
            count = int(batch_config.get('count', 1))

            if count < 1:
                cursor.close()
                return jsonify({"msg": "Start Number cannot be greater than End Number"}), 400
            components = batch_config.get('components', [])
            
            # Check for name collisions before creating anything
            intended_names = [f"{prefix}{start_number + i}" for i in range(count)]
            if intended_names:
                placeholders = ', '.join(['%s'] * len(intended_names))
                query = f"SELECT set_name FROM computer_sets WHERE location_id = %s AND set_name IN ({placeholders})"
                cursor.execute(query, (location_id, *intended_names))
                existing_names = [row['set_name'] for row in cursor.fetchall()]
                
                if existing_names:
                    cursor.close()
                    return jsonify({"msg": f"The following computer set names already exist in this location: {', '.join(existing_names)}"}), 409

            created_ids = []
            
            for i in range(count):
                set_id = uuid.uuid4().hex[:16]
                set_name = f"{prefix}{start_number + i}"
                
                # Create Computer Set
                cursor.execute(
                    "INSERT INTO computer_sets (id, location_id, set_name, status) VALUES (%s, %s, %s, %s)",
                    (set_id, location_id, set_name, 'active')
                )
                created_ids.append(set_id)
                
                # Create Components
                for comp in components:
                    comp_id = uuid.uuid4().hex[:16]
                    props = comp.get('properties')
                    import json
                    props_val = json.dumps(props) if props else None
                    # Convert empty serial to NULL to avoid unique constraint issues
                    serial = comp.get('serial_number')
                    if serial == '' or serial is None:
                        serial = None

                    cursor.execute(
                        "INSERT INTO computer_set_components (id, computer_set_id, department_id, component_type, is_core, brand_name, serial_number, properties, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        (comp_id, set_id, loc_data.get('department_id'), comp.get('component_type'), comp.get('is_core', False), comp.get('brand_name'), serial, props_val, 'good')
                    )

            db.commit()
            cursor.close()
            return jsonify({"msg": f"{count} computer sets created successfully", "ids": created_ids}), 201
            
        else:
            # Single Creation
            set_name = data.get('set_name')
            status = data.get('status', 'active')
            components = data.get('components', [])

            if not set_name:
                cursor.close()
                return jsonify({"msg": "Set Name is required"}), 400

            # Check for name collision
            cursor.execute("SELECT id FROM computer_sets WHERE location_id = %s AND set_name = %s", (location_id, set_name))
            if cursor.fetchone():
                cursor.close()
                return jsonify({"msg": f"Computer set '{set_name}' already exists in this location."}), 409

            set_id = uuid.uuid4().hex[:16]
            
            # Create Computer Set
            cursor.execute(
                "INSERT INTO computer_sets (id, location_id, set_name, status) VALUES (%s, %s, %s, %s)",
                (set_id, location_id, set_name, status)
            )
            
            # Create Components
            for comp in components:
                comp_id = uuid.uuid4().hex[:16]
                props = comp.get('properties')
                import json
                props_val = json.dumps(props) if props else None
                # Convert empty serial to NULL to avoid unique constraint issues
                serial = comp.get('serial_number')
                if serial == '' or serial is None:
                    serial = None

                cursor.execute(
                    "INSERT INTO computer_set_components (id, computer_set_id, department_id, component_type, is_core, brand_name, serial_number, properties, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (comp_id, set_id, loc_data.get('department_id'), comp.get('component_type'), comp.get('is_core', False), comp.get('brand_name'), serial, props_val, 'good')
                )
                
            db.commit()
            cursor.close()
            return jsonify({"msg": "Computer set created successfully", "id": set_id}), 201

    except Exception as e:
        logger.exception("Failed to create computer set(s)")
        cursor.close()
        return jsonify({"msg": "Failed to create computer set(s). Please try again."}), 500

@computer_sets_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head', 'it_technician', 'department_head', 'department_staff', 'lab_assistant'])
def update_computer_set(id):
    data = request.json
    location_id = data.get('location_id') or data.get('laboratory_id')  # Support legacy
    set_name = data.get('set_name')
    status = data.get('status')

    # RBAC Field-Level Validation
    current_claims = get_jwt()
    role = current_claims.get("role")
    full_ops = ['admin', 'it_head', 'it_technician', 'lab_head']

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id, location_id, set_name, status FROM computer_sets WHERE id = %s", (id,))
    existing_set = cursor.fetchone()
    if not existing_set:
        cursor.close()
        return jsonify({"msg": "Computer set not found"}), 404

    # Validate permissions based on what is changing
    # Validate permissions based on what is changing
    move_ops = ['admin', 'it_head', 'department_head', 'lab_head']
    
    if location_id is not None and location_id != existing_set['location_id']:
         if role not in move_ops:
              cursor.close()
              return jsonify({"msg": "Access Denied: You are not authorized to move computer sets"}), 403
         
         # Strict Department Scoping for Heads
         if role in ['department_head', 'lab_head']:
             # Get user's department
             cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (get_jwt_identity(),))
             user_dept = cursor.fetchone()
             
             # Get target location's department
             cursor.execute("SELECT department_id FROM locations WHERE id = %s", (location_id,))
             target_loc = cursor.fetchone()
             
             if not user_dept or not target_loc or user_dept['department_id'] != target_loc['department_id']:
                  cursor.close()
                  return jsonify({"msg": "Access Denied: You can only move sets to locations within your department"}), 403

    if role not in full_ops:
        if set_name is not None and set_name != existing_set['set_name']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You are not authorized to rename computer sets"}), 403

    # If full ops, verify location exists (only if changing)
    if location_id and location_id != existing_set['location_id']:
        cursor.execute("SELECT id FROM locations WHERE id = %s", (location_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Location not found"}), 404

    # Check for name collision (only if changing name or location)
    if (set_name and set_name != existing_set['set_name']) or (location_id and location_id != existing_set['location_id']):
        check_loc = location_id if location_id else existing_set['location_id']
        check_name = set_name if set_name else existing_set['set_name']
        
        cursor.execute("SELECT id FROM computer_sets WHERE location_id = %s AND set_name = %s AND id != %s", (check_loc, check_name, id))
        if cursor.fetchone():
            cursor.close()
            return jsonify({"msg": f"Computer set '{check_name}' already exists in this location."}), 409

    try:
        # Check if we need to sync department_id for components
        if location_id and location_id != existing_set['location_id']:
            # Fetch new department
            cursor.execute("SELECT department_id FROM locations WHERE id = %s", (location_id,))
            new_loc_info = cursor.fetchone()
            new_dept_id = new_loc_info['department_id'] if new_loc_info else None
            
            # Fetch old department
            cursor.execute("SELECT department_id FROM locations WHERE id = %s", (existing_set['location_id'],))
            old_loc_info = cursor.fetchone()
            old_dept_id = old_loc_info['department_id'] if old_loc_info else None
            
            if new_dept_id != old_dept_id:
                # Sync components
                cursor.execute("UPDATE computer_set_components SET department_id = %s WHERE computer_set_id = %s", (new_dept_id, id))

        # Prepare final values for update, failing back to existing if not provided
        final_location_id = location_id if location_id is not None else existing_set['location_id']
        final_set_name = set_name if set_name else existing_set['set_name']
        final_status = status if status else existing_set['status']

        cursor.execute(
            "UPDATE computer_sets SET location_id = %s, set_name = %s, status = %s WHERE id = %s",
            (final_location_id, final_set_name, final_status, id)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Computer set updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update computer set")
        cursor.close()
        return jsonify({"msg": "Failed to update computer set. Please try again."}), 500

@computer_sets_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head'])
def delete_computer_set(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("""
        SELECT cs.id, cs.location_id, cs.set_name, l.name as location_name 
        FROM computer_sets cs 
        JOIN locations l ON cs.location_id = l.id 
        WHERE cs.id = %s
    """, (id,))
    computer_set = cursor.fetchone()
    if not computer_set:
        cursor.close()
        return jsonify({"msg": "Computer set not found"}), 404

    try:
        cursor.execute("DELETE FROM computer_sets WHERE id = %s", (id,))
        db.commit()
        cursor.close()
        return jsonify({"msg": "Computer set deleted successfully"}), 200
    except Exception as e:
        logger.exception("Failed to delete computer set")
        cursor.close()
        return jsonify({"msg": "Failed to delete computer set. Please try again."}), 500

@computer_sets_bp.route('/batch-delete', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head'])
def batch_delete_computer_sets():
    data = request.json
    ids = data.get('ids', [])
    
    if not ids:
        return jsonify({"msg": "No IDs provided"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Fetch details to verify existence
        placeholders = ', '.join(['%s'] * len(ids))
        query = f"SELECT id, set_name, location_id FROM computer_sets WHERE id IN ({placeholders})"
        cursor.execute(query, tuple(ids))
        sets_to_delete = cursor.fetchall()
        
        if not sets_to_delete:
            cursor.close()
            return jsonify({"msg": "No valid computer sets found to delete"}), 404
            
        deleted_count = 0
        
        for set_id in ids:
            cursor.execute("SELECT id FROM computer_sets WHERE id = %s", (set_id,))
            if not cursor.fetchone():
                continue
                
            cursor.execute("DELETE FROM computer_sets WHERE id = %s", (set_id,))
            deleted_count += 1

        if deleted_count == 0:
             cursor.close()
             return jsonify({"msg": "No computer sets were deleted (already deleted or invalid)"}), 404

        db.commit()
        cursor.close()
        return jsonify({"msg": f"Successfully deleted {deleted_count} computer sets"}), 200
        
    except Exception as e:
        logger.exception("Failed to batch delete computer sets")
        db.rollback()
        cursor.close()
        return jsonify({"msg": "Failed to batch delete. Please try again."}), 500
