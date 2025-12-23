from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
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
    computer_set_id = request.args.get('computer_set_id')
    laboratory_id = request.args.get('laboratory_id')
    search = request.args.get('search')
    status = request.args.get('status')
    unassigned = request.args.get('unassigned')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT c.id, c.computer_set_id, c.component_type, c.is_core, c.brand_name, c.serial_number, c.properties, c.status, c.created_at, c.updated_at, 
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
    cursor.execute("SELECT id, computer_set_id, component_type, is_core, brand_name, serial_number, properties, status, created_at, updated_at FROM computer_set_components WHERE id = %s", (id,))
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
        SELECT c.id, c.computer_set_id, c.component_type, c.status, c.brand_name, c.serial_number, c.properties,
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
        import json
        if component.get('properties') and isinstance(component['properties'], str):
            try:
                component['properties'] = json.loads(component['properties'])
            except:
                component['properties'] = {}
        elif not component.get('properties'):
            component['properties'] = {}
            
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
    
    # Verify computer set exists if provided
    if computer_set_id:
        cursor.execute("SELECT id FROM computer_sets WHERE id = %s", (computer_set_id,))
        if not cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Computer set not found"}), 404
    
    try:
        cursor.execute(
            "INSERT INTO computer_set_components (id, computer_set_id, component_type, is_core, brand_name, serial_number, properties, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (component_id, computer_set_id, component_type, is_core, brand_name, serial_number, properties, status)
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
@role_required(['admin', 'it_head', 'it_technician', 'lab_head'])
def update_component(id):
    data = request.json
    computer_set_id = data.get('computer_set_id')
    component_type = data.get('component_type')
    is_core = data.get('is_core')
    brand_name = data.get('brand_name')
    serial_number = data.get('serial_number')
    properties = data.get('properties')
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
        import json
        props_val = json.dumps(properties) if properties is not None else None

        cursor.execute(
            "UPDATE computer_set_components SET computer_set_id = %s, component_type = %s, is_core = %s, brand_name = %s, serial_number = %s, properties = %s, status = %s WHERE id = %s",
            (computer_set_id, component_type, is_core, brand_name, serial_number, props_val, status, id)
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
    
    # Check if exists
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
    
    try:
        # 1. Process Creates
        created_count = 0
        for item in creates:
            comp_id = uuid.uuid4().hex[:16]
            is_core = item.get('is_core', False)
            
            if not item.get('component_type') or not item.get('brand_name'):
                raise Exception("Missing required fields for create")

            props = item.get('properties')
            import json
            props_val = json.dumps(props) if props else None

            cursor.execute(
                "INSERT INTO computer_set_components (id, computer_set_id, component_type, is_core, brand_name, serial_number, properties, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (comp_id, item.get('computer_set_id'), item.get('component_type'), is_core, item.get('brand_name'), item.get('serial_number'), props_val, item.get('status', 'good'))
            )
            created_count += 1

        # 2. Process Updates
        updated_count = 0
        for item in updates:
            if not item.get('id'): continue
            
            props = item.get('properties')
            import json
            props_val = json.dumps(props) if props is not None else None
            
            cursor.execute(
                "UPDATE computer_set_components SET computer_set_id = %s, component_type = %s, is_core = %s, brand_name = %s, serial_number = %s, properties = %s, status = %s WHERE id = %s",
                (item.get('computer_set_id'), item.get('component_type'), item.get('is_core'), item.get('brand_name'), item.get('serial_number'), props_val, item.get('status'), item.get('id'))
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
