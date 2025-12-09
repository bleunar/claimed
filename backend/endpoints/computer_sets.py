from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.database import get_db
from utilities.decorators import role_required
from utilities.activity_logger import log_activity
import uuid

computer_sets_bp = Blueprint('computer_sets', __name__, url_prefix='/computer-sets')

@computer_sets_bp.route('/', methods=['GET'])
@jwt_required()
def list_computer_sets():
    laboratory_id = request.args.get('laboratory_id')
    search = request.args.get('search')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    query = "SELECT id, laboratory_id, set_name, status, created_at, updated_at FROM computer_sets WHERE 1=1"
    params = []
    
    if laboratory_id:
        query += " AND laboratory_id = %s"
        params.append(laboratory_id)
        
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
    cursor.execute("SELECT id, laboratory_id, set_name, status, created_at, updated_at FROM computer_sets WHERE id = %s", (id,))
    computer_set = cursor.fetchone()
    cursor.close()
    
    if not computer_set:
        return jsonify({"msg": "Computer set not found"}), 404
        
    return jsonify(computer_set), 200

@computer_sets_bp.route('/', methods=['POST'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def create_computer_set():
    data = request.json
    laboratory_id = data.get('laboratory_id')
    
    # Check for batch config
    batch_config = data.get('batch_config')
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Verify laboratory exists
    cursor.execute("SELECT id FROM laboratories WHERE id = %s", (laboratory_id,))
    if not cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Laboratory not found"}), 404

    try:
        if batch_config:
            # Batch Creation
            prefix = batch_config.get('prefix', 'PC-')
            start_number = int(batch_config.get('start_number', 1))
            count = int(batch_config.get('count', 1))
            components = batch_config.get('components', [])
            
            created_ids = []
            
            for i in range(count):
                set_id = uuid.uuid4().hex[:16]
                set_name = f"{prefix}{start_number + i}"
                
                # Create Computer Set
                cursor.execute(
                    "INSERT INTO computer_sets (id, laboratory_id, set_name, status) VALUES (%s, %s, %s, %s)",
                    (set_id, laboratory_id, set_name, 'active')
                )
                created_ids.append(set_id)
                
                # Create Components
                for comp in components:
                    comp_id = uuid.uuid4().hex[:16]
                    cursor.execute(
                        "INSERT INTO computer_set_components (id, computer_set_id, component_type, is_core, brand_name, serial_number, status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                        (comp_id, set_id, comp.get('component_type'), comp.get('is_core', False), comp.get('brand_name'), comp.get('serial_number'), 'good')
                    )
                
                log_activity(db, get_jwt_identity(), laboratory_id, 'computer_set', set_id, 'create', f"Created computer set {set_name} (Batch)", changes={'batch_config': batch_config})
            
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

            set_id = uuid.uuid4().hex[:16]
            
            # Create Computer Set
            cursor.execute(
                "INSERT INTO computer_sets (id, laboratory_id, set_name, status) VALUES (%s, %s, %s, %s)",
                (set_id, laboratory_id, set_name, status)
            )
            
            # Create Components
            for comp in components:
                comp_id = uuid.uuid4().hex[:16]
                cursor.execute(
                    "INSERT INTO computer_set_components (id, computer_set_id, component_type, is_core, brand_name, serial_number, status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (comp_id, set_id, comp.get('component_type'), comp.get('is_core', False), comp.get('brand_name'), comp.get('serial_number'), 'good')
                )
            
            log_activity(db, get_jwt_identity(), laboratory_id, 'computer_set', set_id, 'create', f"Created computer set {set_name}", changes=data)
                
            db.commit()
            cursor.close()
            return jsonify({"msg": "Computer set created successfully", "id": set_id}), 201

    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to create computer set(s): {str(e)}"}), 500

@computer_sets_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def update_computer_set(id):
    data = request.json
    laboratory_id = data.get('laboratory_id')
    set_name = data.get('set_name')
    status = data.get('status')

    if not all([laboratory_id, set_name, status]):
        return jsonify({"msg": "Laboratory ID, Set Name, and Status are required"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id FROM computer_sets WHERE id = %s", (id,))
    if not cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Computer set not found"}), 404

    # Verify laboratory exists
    cursor.execute("SELECT id FROM laboratories WHERE id = %s", (laboratory_id,))
    if not cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Laboratory not found"}), 404

    try:
        cursor.execute(
            "UPDATE computer_sets SET laboratory_id = %s, set_name = %s, status = %s WHERE id = %s",
            (laboratory_id, set_name, status, id)
        )
        log_activity(db, get_jwt_identity(), laboratory_id, 'computer_set', id, 'update', f"Updated computer set {set_name}", changes=data)
        db.commit()
        cursor.close()
        return jsonify({"msg": "Computer set updated successfully"}), 200
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to update computer set: {str(e)}"}), 500

@computer_sets_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def delete_computer_set(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    # Check if exists
    cursor.execute("SELECT id, laboratory_id FROM computer_sets WHERE id = %s", (id,))
    computer_set = cursor.fetchone()
    if not computer_set:
        cursor.close()
        return jsonify({"msg": "Computer set not found"}), 404

    try:
        cursor.execute("DELETE FROM computer_sets WHERE id = %s", (id,))
        log_activity(db, get_jwt_identity(), computer_set['laboratory_id'], 'computer_set', id, 'delete', f"Deleted computer set {id}")
        db.commit()
        cursor.close()
        return jsonify({"msg": "Computer set deleted successfully"}), 200
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to delete computer set: {str(e)}"}), 500
