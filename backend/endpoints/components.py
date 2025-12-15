from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.database import get_db
from utilities.decorators import role_required
from utilities.activity_logger import log_activity
import uuid

components_bp = Blueprint('components', __name__, url_prefix='/components')

@components_bp.route('/', methods=['GET'])
@jwt_required()
def list_components():
    computer_set_id = request.args.get('computer_set_id')
    laboratory_id = request.args.get('laboratory_id')
    search = request.args.get('search')
    status = request.args.get('status')
    unassigned = request.args.get('unassigned')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT c.id, c.computer_set_id, c.component_type, c.is_core, c.brand_name, c.serial_number, c.status, c.created_at, c.updated_at, 
               cs.set_name as computer_set_name, l.name as laboratory_name, cs.laboratory_id
        FROM computer_set_components c
        LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id
        LEFT JOIN laboratories l ON cs.laboratory_id = l.id
        WHERE 1=1
    """
    params = []
    
    if computer_set_id:
        query += " AND c.computer_set_id = %s"
        params.append(computer_set_id)

    if laboratory_id:
        query += " AND cs.laboratory_id = %s"
        params.append(laboratory_id)
        
    if status:
        query += " AND c.status = %s"
        params.append(status)

    if unassigned == 'true':
        query += " AND c.computer_set_id IS NULL"
    elif unassigned == 'false':
        query += " AND c.computer_set_id IS NOT NULL"

    if request.args.get('component_type'):
        query += " AND c.component_type = %s"
        params.append(request.args.get('component_type'))
        
    if search:
        query += " AND (c.brand_name LIKE %s OR c.serial_number LIKE %s)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    query += " ORDER BY c.is_core DESC, c.component_type ASC"
        
    cursor.execute(query, tuple(params))
    components = cursor.fetchall()
    cursor.close()
    return jsonify(components), 200

@components_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_component(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, computer_set_id, component_type, is_core, brand_name, serial_number, status, created_at, updated_at FROM computer_set_components WHERE id = %s", (id,))
    component = cursor.fetchone()
    cursor.close()
    
    if not component:
        return jsonify({"msg": "Component not found"}), 404
        
    return jsonify(component), 200

@components_bp.route('/check-serial', methods=['GET'])
@jwt_required()
def check_serial():
    serial_number = request.args.get('serial_number')
    if not serial_number:
        return jsonify({"msg": "Serial Number is required"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT c.id, c.computer_set_id, c.component_type, c.status, c.brand_name, c.serial_number,
               cs.set_name as computer_set_name, l.name as laboratory_name
        FROM computer_set_components c
        LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id
        LEFT JOIN laboratories l ON cs.laboratory_id = l.id
        WHERE c.serial_number = %s
    """
    
    cursor.execute(query, (serial_number,))
    component = cursor.fetchone()
    cursor.close()
    
    if component:
        return jsonify({"exists": True, "component": component}), 200
    else:
        return jsonify({"exists": False}), 200


@components_bp.route('/', methods=['POST'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def create_component():
    data = request.json
    computer_set_id = data.get('computer_set_id')
    component_type = data.get('component_type')
    is_core = data.get('is_core', True)
    brand_name = data.get('brand_name')
    serial_number = data.get('serial_number')
    status = data.get('status', 'good')

    if not all([component_type, brand_name]):
        return jsonify({"msg": "Component Type and Brand Name are required"}), 400

    component_id = uuid.uuid4().hex[:16]
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Verify computer set exists if provided
    if computer_set_id:
        cursor.execute("SELECT id FROM computer_sets WHERE id = %s", (computer_set_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Computer set not found"}), 404
    
    try:
        cursor.execute(
            "INSERT INTO computer_set_components (id, computer_set_id, component_type, is_core, brand_name, serial_number, status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (component_id, computer_set_id, component_type, is_core, brand_name, serial_number, status)
        )
        
        # Resolve laboratory_id for logging
        lab_id_for_log = None
        if computer_set_id:
            cursor.execute("SELECT laboratory_id FROM computer_sets WHERE id = %s", (computer_set_id,))
            res = cursor.fetchone()
            if res:
                lab_id_for_log = res['laboratory_id']
        
        # If not found via set, check if passed in data (for unassigned creation in a lab context)
        if not lab_id_for_log:
             lab_id_for_log = data.get('laboratory_id')

        if lab_id_for_log:
            log_activity(db, get_jwt_identity(), lab_id_for_log, 'component', component_id, 'create', f"Created component {brand_name}", changes=data)

        db.commit()
        cursor.close()
        return jsonify({"msg": "Component created successfully", "id": component_id}), 201
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to create component: {str(e)}"}), 500

@components_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'it_head', 'it_technician'])
def update_component(id):
    data = request.json
    computer_set_id = data.get('computer_set_id')
    component_type = data.get('component_type')
    is_core = data.get('is_core')
    brand_name = data.get('brand_name')
    serial_number = data.get('serial_number')
    status = data.get('status')

    if not all([component_type, brand_name, status]):
        return jsonify({"msg": "Component Type, Brand Name, and Status are required"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT * FROM computer_set_components WHERE id = %s", (id,))
    existing_component = cursor.fetchone()
    if not existing_component:
        cursor.close()
        return jsonify({"msg": "Component not found"}), 404

    # Verify computer set exists if provided
    if computer_set_id:
        cursor.execute("SELECT id FROM computer_sets WHERE id = %s", (computer_set_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Computer set not found"}), 404

    try:
        cursor.execute(
            "UPDATE computer_set_components SET computer_set_id = %s, component_type = %s, is_core = %s, brand_name = %s, serial_number = %s, status = %s WHERE id = %s",
            (computer_set_id, component_type, is_core, brand_name, serial_number, status, id)
        )
        
        # Resolve laboratory_id for logging
        lab_id_for_log = None
        if computer_set_id:
            cursor.execute("SELECT laboratory_id FROM computer_sets WHERE id = %s", (computer_set_id,))
            res = cursor.fetchone()
            if res:
                lab_id_for_log = res['laboratory_id']
        
        if not lab_id_for_log:
             lab_id_for_log = data.get('laboratory_id')

        if lab_id_for_log:
            changes = {}
            fields_to_check = ['computer_set_id', 'component_type', 'is_core', 'brand_name', 'serial_number', 'status']
            
            for field in fields_to_check:
                old_val = existing_component.get(field)
                new_val = data.get(field)
                
                # Handle boolean conversion for is_core if needed
                if field == 'is_core':
                    new_val = bool(new_val) if new_val is not None else old_val
                    old_val = bool(old_val)

                if str(old_val) != str(new_val):
                    changes[field] = {
                        "previous": old_val,
                        "current": new_val
                    }

            if changes:
                log_activity(db, get_jwt_identity(), lab_id_for_log, 'component', id, 'update', f"Updated component {brand_name}", changes=changes)

        db.commit()
        cursor.close()
        return jsonify({"msg": "Component updated successfully"}), 200
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to update component: {str(e)}"}), 500

@components_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def delete_component(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id FROM computer_set_components WHERE id = %s", (id,))
    if not cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Component not found"}), 404

    # Fetch details for logging before delete
    cursor.execute("""
        SELECT c.id, cs.laboratory_id 
        FROM computer_set_components c 
        LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id 
        WHERE c.id = %s
    """, (id,))
    component_details = cursor.fetchone()

    try:
        cursor.execute("DELETE FROM computer_set_components WHERE id = %s", (id,))
        
        if component_details and component_details.get('laboratory_id'):
            log_activity(db, get_jwt_identity(), component_details['laboratory_id'], 'component', id, 'delete', f"Deleted component {id}")
            
        db.commit()
        cursor.close()
        return jsonify({"msg": "Component deleted successfully"}), 200
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to delete component: {str(e)}"}), 500

@components_bp.route('/batch-transaction', methods=['POST'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head', 'it_technician'])
def batch_component_transaction():
    data = request.json
    creates = data.get('creates', [])
    updates = data.get('updates', [])
    deletes = data.get('deletes', [])
    
    if not (creates or updates or deletes):
        return jsonify({"msg": "No operations provided"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Track affected items for logging
    affected_lab_id = None # Determine context. Usually all in same lab/set context?
    # If operations span multiple labs, we might need multiple logs, or just pick one.
    # Typically frontend uses this for one "Set" management which is in one "Lab".
    
    summary_parts = []
    
    try:
        # 1. Process Creates
        created_count = 0
        for item in creates:
            comp_id = uuid.uuid4().hex[:16]
            is_core = item.get('is_core', False) # Default to false if not specified, but usually passed
            
            # Determine validation
            if not item.get('component_type') or not item.get('brand_name'):
                raise Exception("Missing required fields for create")

            cursor.execute(
                "INSERT INTO computer_set_components (id, computer_set_id, component_type, is_core, brand_name, serial_number, status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (comp_id, item.get('computer_set_id'), item.get('component_type'), is_core, item.get('brand_name'), item.get('serial_number'), item.get('status', 'good'))
            )
            created_count += 1
            
            # Capture Lab ID from payload if possible, or we will query it later
            if not affected_lab_id and item.get('laboratory_id'):
                affected_lab_id = item.get('laboratory_id')

        if created_count > 0:
            summary_parts.append(f"Added {created_count} components")

        # 2. Process Updates
        updated_count = 0
        for item in updates:
            if not item.get('id'): continue
            
            # We just execute update. Optimistic that frontend sent valid data.
            cursor.execute(
                "UPDATE computer_set_components SET computer_set_id = %s, component_type = %s, is_core = %s, brand_name = %s, serial_number = %s, status = %s WHERE id = %s",
                (item.get('computer_set_id'), item.get('component_type'), item.get('is_core'), item.get('brand_name'), item.get('serial_number'), item.get('status'), item.get('id'))
            )
            updated_count += 1
            if not affected_lab_id and item.get('laboratory_id'):
                affected_lab_id = item.get('laboratory_id')

        if updated_count > 0:
            summary_parts.append(f"Updated {updated_count} components")

        # 3. Process Deletes
        deleted_count = 0
        if deletes:
            # Need to find lab id before delete if we don't have it
            if not affected_lab_id:
                placeholders = ', '.join(['%s'] * len(deletes))
                cursor.execute(f"""
                    SELECT cs.laboratory_id 
                    FROM computer_set_components c 
                    JOIN computer_sets cs ON c.computer_set_id = cs.id 
                    WHERE c.id IN ({placeholders}) LIMIT 1
                """, tuple(deletes))
                res = cursor.fetchone()
                if res: affected_lab_id = res['laboratory_id']

            del_placeholders = ', '.join(['%s'] * len(deletes))
            cursor.execute(f"DELETE FROM computer_set_components WHERE id IN ({del_placeholders})", tuple(deletes))
            deleted_count = len(deletes)
        
        if deleted_count > 0:
            summary_parts.append(f"Deleted {deleted_count} components")

        # Fallback Lab ID if still unknown (e.g. creating unassigned components)
        # Maybe frontend passed a top-level laboratory_id?
        if not affected_lab_id:
            affected_lab_id = data.get('laboratory_id')
            
        if affected_lab_id and summary_parts:
            summary = "Batch Component Config: " + ", ".join(summary_parts)
            # Use a dummy target ID (maybe the first created/updated one, or just the Lab ID as context)
            # Schema requires target_id for specific types... 'component' needs comp id. 'computer_set' needs set id.
            # 'laboratory' needs lab id.
            # Let's log as 'laboratory' target type since it affects the lab state broadly?
            # Or 'computer_set' if all are in one set?
            # Safe bet: 'component' type, pick random ID, or define new generic logic. 
            # Current logger uses target_id for linking. 
            # Let's just use the first available ID as the "primary" link, or standard log_activity format.
            
            # If we have a set_id in context, use that?
            # Front end typically manages ONE set.
            set_id = creates[0].get('computer_set_id') if creates else (updates[0].get('computer_set_id') if updates else None)
            
            target_type = 'computer_set' if set_id else 'component'
            target_id = set_id if set_id else (deletes[0] if deletes else None)
            
            if not target_id and creates: target_id = 'batch-create' # Placeholder if no linking possible
            
            log_activity(
                db, 
                get_jwt_identity(), 
                affected_lab_id, 
                target_type, 
                target_id, 
                'update', 
                summary, 
                changes={'creates': len(creates), 'updates': len(updates), 'deletes': len(deletes)}
            )

        db.commit()
        cursor.close()
        return jsonify({"msg": "Batch transaction completed successfully"}), 200

    except Exception as e:
        db.rollback()
        cursor.close()
        return jsonify({"msg": f"Batch transaction failed: {str(e)}"}), 500
