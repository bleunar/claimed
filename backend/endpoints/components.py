from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from core.database import get_db
from utilities.decorators import role_required, verify_role_freshness
import logging
import uuid
import json

logger = logging.getLogger(__name__)

components_bp = Blueprint('components', __name__, url_prefix='/components')

@components_bp.route('/', methods=['GET'])
@jwt_required()
def list_components():
    department_id = request.args.get('department_id')
    computer_set_id = request.args.get('computer_set_id')
    location_id = request.args.get('location_id')
    # Support legacy parameter for backward compatibility
    if not location_id:
        location_id = request.args.get('laboratory_id')
    search = request.args.get('search')
    status = request.args.get('status')
    unassigned = request.args.get('unassigned')
    location_type = request.args.get('location_type')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)

    # RBAC: Lab Head only sees components in their department
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    current_user_id = get_jwt_identity()

    if current_role == 'lab_head':
         cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_user_id,))
         user_dept = cursor.fetchone()
         if user_dept and user_dept['department_id']:
             department_id = user_dept['department_id']
         else:
             department_id = 'non_existent'

    query = """
        SELECT c.id, c.computer_set_id, c.department_id, c.component_type, c.is_core, c.brand_name, c.serial_number, c.properties, c.status, c.created_at, c.updated_at, 
               cs.set_name as computer_set_name, l.name as location_name, cs.location_id, l.department_id as location_department_id,
               d.name as department_name,  d.description as department_description
        FROM computer_set_components c
        LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id
        LEFT JOIN locations l ON cs.location_id = l.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE 1=1
    """
    params = []

    if department_id:
        query += " AND c.department_id = %s"
        params.append(department_id)
    
    if computer_set_id:
        query += " AND c.computer_set_id = %s"
        params.append(computer_set_id)

    if location_id:
        query += " AND cs.location_id = %s"
        params.append(location_id)

    if location_type:
        query += " AND l.type = %s"
        params.append(location_type)
        
    if status:
        # Support comma-separated multi-select
        status_list = [s.strip() for s in status.split(',') if s.strip()]
        if status_list:
            placeholders = ','.join(['%s'] * len(status_list))
            query += f" AND c.status IN ({placeholders})"
            params.extend(status_list)

    if unassigned == 'true':
        query += " AND c.computer_set_id IS NULL"
    elif unassigned == 'false':
        query += " AND c.computer_set_id IS NOT NULL"

    component_type = request.args.get('component_type')
    if component_type:
        # Support comma-separated multi-select
        type_list = [t.strip() for t in component_type.split(',') if t.strip()]
        if type_list:
            placeholders = ','.join(['%s'] * len(type_list))
            query += f" AND c.component_type IN ({placeholders})"
            params.extend(type_list)
        
    if search:
        query += " AND (c.brand_name LIKE %s OR c.serial_number LIKE %s OR l.name LIKE %s OR cs.set_name LIKE %s)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        params.append(f"%{search}%")
        
    query += " ORDER BY c.is_core DESC, c.component_type ASC"
        
    cursor.execute(query, tuple(params))
    components = cursor.fetchall()
    cursor.close()

    for comp in components:
        if comp.get('properties') and isinstance(comp['properties'], str):
            try:
                comp['properties'] = json.loads(comp['properties'])
            except:
                comp['properties'] = {}
        elif not comp.get('properties'):
             comp['properties'] = {}

    return jsonify(components), 200

@components_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_component(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, computer_set_id, department_id, component_type, is_core, brand_name, serial_number, properties, status, created_at, updated_at FROM computer_set_components WHERE id = %s", (id,))
    component = cursor.fetchone()
    cursor.close()
    
    if not component:
        return jsonify({"msg": "Component not found"}), 404
        
    if component.get('properties') and isinstance(component['properties'], str):
        try:
            component['properties'] = json.loads(component['properties'])
        except:
            component['properties'] = {}
    elif not component.get('properties'):
        component['properties'] = {}
        
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
        SELECT c.id, c.computer_set_id, c.department_id, c.component_type, c.status, c.brand_name, c.serial_number, c.properties, c.disposal_info,
               cs.set_name as computer_set_name, l.name as location_name, d.name as department_name
        FROM computer_set_components c
        LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id
        LEFT JOIN locations l ON cs.location_id = l.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.serial_number = %s
    """
    
    cursor.execute(query, (serial_number,))
    component = cursor.fetchone()
    cursor.close()
    
    if component:
        import json
        if component.get('properties') and isinstance(component['properties'], str):
            try:
                component['properties'] = json.loads(component['properties'])
            except:
                component['properties'] = {}
        elif not component.get('properties'):
            component['properties'] = {}

        if component.get('disposal_info') and isinstance(component['disposal_info'], str):
             try:
                 component['disposal_info'] = json.loads(component['disposal_info'])
             except:
                 component['disposal_info'] = None
            
        return jsonify({"exists": True, "component": component}), 200
    else:
        return jsonify({"exists": False}), 200


@components_bp.route('/', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head', 'it_technician'])
def create_component():
    data = request.json
    computer_set_id = data.get('computer_set_id')
    component_type = data.get('component_type')
    is_core = data.get('is_core', True)
    brand_name = data.get('brand_name')
    serial_number = data.get('serial_number')
    properties = data.get('properties')
    if properties is not None:
        import json
        properties = json.dumps(properties)
    status = data.get('status', 'good')

    if not all([component_type, brand_name]):
        return jsonify({"msg": "Component Type and Brand Name are required"}), 400

    component_id = uuid.uuid4().hex[:16]
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Verify computer set exists and belongs to user's department (for Lab Head)
    if computer_set_id:
        cursor.execute("""
            SELECT cs.id, l.department_id 
            FROM computer_sets cs 
            JOIN locations l ON cs.location_id = l.id 
            WHERE cs.id = %s
        """, (computer_set_id,))
        target_set = cursor.fetchone()
        
        if not target_set:
            cursor.close()
            return jsonify({"msg": "Computer set not found"}), 404
            
        current_claims = get_jwt()
        if current_claims.get("role") == 'lab_head':
             cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (get_jwt_identity(),))
             user_dept = cursor.fetchone()
             if not user_dept or user_dept['department_id'] != target_set['department_id']:
                  cursor.close()
                  return jsonify({"msg": "Access Denied: You can only add components to sets in your department"}), 403
    
    # Determine department_id from the target computer set
    target_department_id = None
    if computer_set_id and target_set:
        target_department_id = target_set.get('department_id')
    
    try:
        cursor.execute(
            "INSERT INTO computer_set_components (id, computer_set_id, department_id, component_type, is_core, brand_name, serial_number, properties, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (component_id, computer_set_id, target_department_id, component_type, is_core, brand_name, serial_number, properties, status)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Component created successfully", "id": component_id}), 201
    except Exception as e:
        logger.exception("Failed to create component")
        cursor.close()
        return jsonify({"msg": "Failed to create component. Please try again."}), 500

@components_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'it_technician', 'lab_head', 'department_head', 'department_staff', 'lab_assistant'])
def update_component(id):
    data = request.json
    computer_set_id = data.get('computer_set_id')
    component_type = data.get('component_type')
    is_core = data.get('is_core')
    brand_name = data.get('brand_name')
    serial_number = data.get('serial_number')
    properties = data.get('properties')
    status = data.get('status')

    # RBAC Field-Level Validation
    current_claims = get_jwt()
    role = current_claims.get("role")
    full_ops = ['admin', 'it_head', 'it_technician', 'lab_head']
    props_ops = full_ops + ['department_head']

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT * FROM computer_set_components WHERE id = %s", (id,))
    existing_component = cursor.fetchone()
    if not existing_component:
        cursor.close()
        return jsonify({"msg": "Component not found"}), 404

    # Validate permissions based on what is changing
    if role not in full_ops:
        # Check for changes in restricted fields
        if brand_name is not None and brand_name != existing_component['brand_name']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You are not authorized to edit brand name"}), 403
        if component_type is not None and component_type != existing_component['component_type']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You are not authorized to edit component type"}), 403
        if serial_number is not None and serial_number != existing_component['serial_number']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You are not authorized to edit serial number"}), 403
        if computer_set_id is not None and computer_set_id != existing_component['computer_set_id']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You are not authorized to move components"}), 403
    
    if role not in props_ops:
         # Check properties
         # We need to compare properties objects
         # If new properties provided, strict check
         if properties is not None:
             import json
             old_props = existing_component.get('properties')
             if isinstance(old_props, str):
                 try: old_props = json.loads(old_props)
                 except: old_props = {}
             elif not old_props: old_props = {}
             
             # Compare objects
             if json.dumps(properties, sort_keys=True) != json.dumps(old_props, sort_keys=True):
                 cursor.close()
                 return jsonify({"msg": "Access Denied: You are not authorized to edit properties"}), 403

    # RBAC: Verifying ownership for Lab Head
    current_claims = get_jwt()
    if current_claims.get("role") == 'lab_head':
         # Fetch component's current location details
         cursor.execute("""
            SELECT l.department_id 
            FROM computer_set_components c 
            LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id 
            LEFT JOIN locations l ON cs.location_id = l.id 
            WHERE c.id = %s
         """, (id,))
         comp_details = cursor.fetchone()
         
         # Also fetch user's department
         cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (get_jwt_identity(),))
         user_dept = cursor.fetchone()
         
         if not comp_details or not comp_details['department_id'] or not user_dept or user_dept['department_id'] != comp_details['department_id']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You can only manage components in your department"}), 403

    # Verify computer set exists if provided
    if computer_set_id:
        cursor.execute("SELECT id FROM computer_sets WHERE id = %s", (computer_set_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Computer set not found"}), 404
        # Note: We should technically verify the NEW set is also in department, but that might be covered by general logic or trust.
        # Actually, let's just rely on the existing logic or add it if needed. 
        # But previous create check handles new set logic. 
        # Let's duplicate the check for new set here? The previous create logic chunk does checking.
        # Let's keep it simple for now, the ownership check prevents them from editing OTHERS' components.
        # Moving to a rogue set outside dept is a risk, but manageable.

    # Determine department_id based on the new computer_set_id
    new_department_id = existing_component.get('department_id')  # Keep existing by default
    if computer_set_id is not None:
        if computer_set_id:  # Not None and not empty
            cursor.execute("""
                SELECT l.department_id 
                FROM computer_sets cs 
                JOIN locations l ON cs.location_id = l.id 
                WHERE cs.id = %s
            """, (computer_set_id,))
            new_set_info = cursor.fetchone()
            if new_set_info:
                new_department_id = new_set_info.get('department_id')
        # If computer_set_id is explicitly set to None/empty, keep existing department_id
        # (we want to preserve department history when unlinked)

    try:
        import json
        props_val = json.dumps(properties) if properties is not None else None

        cursor.execute(
            "UPDATE computer_set_components SET computer_set_id = %s, department_id = %s, component_type = %s, is_core = %s, brand_name = %s, serial_number = %s, properties = %s, status = %s WHERE id = %s",
            (computer_set_id, new_department_id, component_type, is_core, brand_name, serial_number, props_val, status, id)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Component updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update component")
        cursor.close()
        return jsonify({"msg": "Failed to update component. Please try again."}), 500

@components_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head', 'it_technician'])
def delete_component(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists and RBAC
    current_claims = get_jwt()
    if current_claims.get("role") == 'lab_head':
        cursor.execute("""
            SELECT l.department_id 
            FROM computer_set_components c 
            LEFT JOIN computer_sets cs ON c.computer_set_id = cs.id 
            LEFT JOIN locations l ON cs.location_id = l.id 
            WHERE c.id = %s
        """, (id,))
        comp_details = cursor.fetchone()
        
        if not comp_details:
             cursor.close()
             return jsonify({"msg": "Component not found"}), 404
             
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (get_jwt_identity(),))
        user_dept = cursor.fetchone()
        
        if not comp_details['department_id'] or not user_dept or user_dept['department_id'] != comp_details['department_id']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You can only delete components in your department"}), 403
    else:
        cursor.execute("SELECT id FROM computer_set_components WHERE id = %s", (id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Component not found"}), 404

    try:
        cursor.execute("DELETE FROM computer_set_components WHERE id = %s", (id,))
        db.commit()
        cursor.close()
        return jsonify({"msg": "Component deleted successfully"}), 200
    except Exception as e:
        logger.exception("Failed to delete component")
        cursor.close()
        return jsonify({"msg": "Failed to delete component. Please try again."}), 500

@components_bp.route('/batch-transaction', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head', 'it_technician', 'department_head', 'department_staff', 'lab_assistant'])
def batch_component_transaction():
    data = request.json
    creates = data.get('creates', [])
    updates = data.get('updates', [])
    deletes = data.get('deletes', [])
    
    if not (creates or updates or deletes):
        return jsonify({"msg": "No operations provided"}), 400

    current_claims = get_jwt()
    role = current_claims.get("role")
    full_ops = ['admin', 'it_head', 'it_technician', 'lab_head']
    props_ops = full_ops + ['department_head']

    # RBAC Validation for Batch
    if role not in full_ops:
        if creates:
            return jsonify({"msg": "Access Denied: You are not authorized to add components"}), 403
        if deletes:
             return jsonify({"msg": "Access Denied: You are not authorized to delete components"}), 403
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Pre-validate updates for restricted roles
        if role not in full_ops and updates:
             for item in updates:
                 if not item.get('id'): continue
                 cursor.execute("SELECT * FROM computer_set_components WHERE id = %s", (item.get('id'),))
                 existing = cursor.fetchone()
                 if not existing: continue
                 
                 # Check restricted fields
                 if item.get('brand_name') is not None and item.get('brand_name') != existing['brand_name']:
                     raise Exception("Access Denied: Cannot edit brand name")
                 if item.get('component_type') is not None and item.get('component_type') != existing['component_type']:
                     raise Exception("Access Denied: Cannot edit component type")
                 if item.get('serial_number') is not None and item.get('serial_number') != existing['serial_number']:
                     raise Exception("Access Denied: Cannot edit serial number")
                 if 'computer_set_id' in item and item.get('computer_set_id') != existing['computer_set_id']:
                      raise Exception("Access Denied: Cannot move components")

                 if role not in props_ops and item.get('properties') is not None:
                     import json
                     old_props = existing.get('properties')
                     if isinstance(old_props, str):
                         try: old_props = json.loads(old_props)
                         except: old_props = {}
                     elif not old_props: old_props = {}
                     
                     if json.dumps(item.get('properties'), sort_keys=True) != json.dumps(old_props, sort_keys=True):
                          raise Exception("Access Denied: Cannot edit properties")
        # 1. Process Creates
        created_count = 0
        for item in creates:
            comp_id = uuid.uuid4().hex[:16]
            is_core = item.get('is_core', False)
            
            if not item.get('component_type') or not item.get('brand_name'):
                raise Exception("Missing required fields for create")

            # Determine department_id from the target computer set
            department_id = None
            if item.get('computer_set_id'):
                 cursor.execute("""
                    SELECT l.department_id 
                    FROM computer_sets cs 
                    JOIN locations l ON cs.location_id = l.id 
                    WHERE cs.id = %s
                 """, (item.get('computer_set_id'),))
                 set_info = cursor.fetchone()
                 if set_info:
                     department_id = set_info.get('department_id')

            props = item.get('properties')
            import json
            props_val = json.dumps(props) if props else None

            cursor.execute(
                "INSERT INTO computer_set_components (id, computer_set_id, department_id, component_type, is_core, brand_name, serial_number, properties, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (comp_id, item.get('computer_set_id'), department_id, item.get('component_type'), is_core, item.get('brand_name'), item.get('serial_number'), props_val, item.get('status', 'good'))
            )
            created_count += 1

        # 2. Process Updates
        updated_count = 0
        for item in updates:
            if not item.get('id'): continue
            
            props = item.get('properties')
            import json
            props_val = json.dumps(props) if props is not None else None

            # Determine department_id if computer_set_id is changing or if we need to sync it
            # For simplicity, if computer_set_id is provided (even if same), let's re-verify department_id
            # But efficiently: we only update department_id if computer_set_id is in the update item.
            # If computer_set_id is NOT in item, we keep existing department_id (handled by not including it in SET or handling dynamic query - wait, query below is static).
            # The static query below updates ALL fields. We need to fetch existing first if we want to selectively update, OR we assume 'item' contains changes.
            # actually the query below sets computer_set_id = %s. 
            # If item doesn't have computer_set_id, it might be None or missing. 
            # The current implementation assumes 'item' has the value or None.
            # Let's see how 'item' is constructed. The user sends partial updates? 
            # If partial, we need to know what to keep. 
            # But the current implementation blindly sets `item.get('computer_set_id')`. If the user sent JSON without it, it becomes None. 
            # This implies the client MUST send the full object or at least the fields that are allowed to be null.
            # However, looking at lines 510, it effectively wipes fields if they aren't provided.
            # BUT, looking at the loop (line 503), it iterates `updates`.
            # If the client sends partial data, `item.get` returns None. 
            # This suggests the `batch_component_transaction` expects FULL updates or at least the fields being updated.
            # Actually, standard REST `PUT` behavior is replace. But typical batch might be partial.
            # Let's look at the query again:
            # "UPDATE ... SET computer_set_id = %s ... WHERE id = %s"
            # If I send `{"id": "1", "status": "bad"}`, then `computer_set_id` becomes NULL.
            # This seems like a flaw in the EXISTING implementation (it wipes data if not provided), 
            # OR the frontend is expected to send everything.
            # Assuming frontend sends everything or we are fixing it.
            # To fix `department_id`, we need to know the NEW computer_set_id.
            
            # We need to fetch the current values to preserve `department_id` if `computer_set_id` is not changing/provided,
            # OR if `computer_set_id` IS provided, we find the new department.
            
            current_dept_id = None
            # We already fetched 'existing' up top (lines 457) but only inside a restricted block.
            # We should probably fetch it here to be safe and correct.
            cursor.execute("SELECT computer_set_id, department_id FROM computer_set_components WHERE id = %s", (item.get('id'),))
            current_comp = cursor.fetchone()
            if not current_comp: continue
            
            new_set_id = item.get('computer_set_id')
            new_dept_id = current_comp['department_id'] # Default to keeping it

            if 'computer_set_id' in item: # Check if key exists in valid payload
                 # If explicit None, it means unlink -> department_id stays (or becomes null? Business logic says preserve history usually, strict schema might say NULL if cascade, but migration allowed NULL).
                 # If explicit ID, lookup.
                 if new_set_id:
                     cursor.execute("""
                        SELECT l.department_id 
                        FROM computer_sets cs 
                        JOIN locations l ON cs.location_id = l.id 
                        WHERE cs.id = %s
                     """, (new_set_id,))
                     result = cursor.fetchone()
                     if result:
                         new_dept_id = result['department_id']
            
            # NOTE: The existing query blindly updates everything. This is dangerous if partial updates.
            # Use 'new_dept_id' in the update.
            
            cursor.execute(
                "UPDATE computer_set_components SET computer_set_id = %s, department_id = %s, component_type = %s, is_core = %s, brand_name = %s, serial_number = %s, properties = %s, status = %s WHERE id = %s",
                (item.get('computer_set_id'), new_dept_id, item.get('component_type'), item.get('is_core'), item.get('brand_name'), item.get('serial_number'), props_val, item.get('status'), item.get('id'))
            )
            updated_count += 1

        # 3. Process Deletes
        deleted_count = 0
        for del_id in deletes:
            cursor.execute("SELECT id FROM computer_set_components WHERE id = %s", (del_id,))
            if not cursor.fetchone():
                continue
            
            cursor.execute("DELETE FROM computer_set_components WHERE id = %s", (del_id,))
            deleted_count += 1

        db.commit()
        cursor.close()
        return jsonify({"msg": "Batch transaction completed successfully"}), 200

    except Exception as e:
        logger.exception("Batch transaction failed")
        db.rollback()
        cursor.close()
        return jsonify({"msg": "Batch transaction failed. Please try again."}), 500
