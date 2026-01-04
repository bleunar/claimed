from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from core.database import get_db
from utilities.decorators import role_required, verify_role_freshness
import logging
import uuid

logger = logging.getLogger(__name__)

departments_bp = Blueprint('departments', __name__, url_prefix='/departments')

@departments_bp.route('/', methods=['GET'])
@jwt_required()
def list_departments():
    """List all departments"""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, name, description, created_at, updated_at FROM departments ORDER BY name")
    departments = cursor.fetchall()
    cursor.close()
    return jsonify(departments), 200

@departments_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_department(id):
    """Get a single department by ID"""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, name, description, created_at, updated_at FROM departments WHERE id = %s", (id,))
    department = cursor.fetchone()
    cursor.close()
    
    if not department:
        return jsonify({"msg": "Department not found"}), 404
        
    return jsonify(department), 200

@departments_bp.route('/', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin'])
def create_department():
    """Create a new department (admin only)"""
    data = request.json
    name = data.get('name')
    description = data.get('description')

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)

    # Check for duplicate name
    cursor.execute("SELECT id FROM departments WHERE name = %s", (name,))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Department name already exists"}), 409
    
    try:
        dept_id = uuid.uuid4().hex[:16]
        cursor.execute(
            "INSERT INTO departments (id, name, description) VALUES (%s, %s, %s)",
            (dept_id, name, description)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Department created successfully", "id": dept_id}), 201
    except Exception as e:
        logger.exception("Failed to create department")
        cursor.close()
        return jsonify({"msg": "Failed to create department. Please try again."}), 500

@departments_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@verify_role_freshness
@role_required(['admin'])
def update_department(id: str):
    """Update a department (admin only)"""
    data = request.json
    name = data.get('name', '')
    description = data.get('description', '')

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id FROM departments WHERE id = %s", (id,))
    if not cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Department not found"}), 404

    # Check for duplicate name (excluding current)
    cursor.execute("SELECT id FROM departments WHERE name = %s AND id != %s", (name, id))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Department name already exists"}), 409

    try:
        cursor.execute(
            "UPDATE departments SET name = %s, description = %s WHERE id = %s",
            (name, description, id)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Department updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update department")
        cursor.close()
        return jsonify({"msg": "Failed to update department. Please try again."}), 500

@departments_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@verify_role_freshness
@role_required(['admin'])
def delete_department(id):
    """Delete a department (admin only). Accounts with this department will have department_id set to NULL."""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id FROM departments WHERE id = %s", (id,))
    if not cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Department not found"}), 404

    try:
        cursor.execute("DELETE FROM departments WHERE id = %s", (id,))
        db.commit()
        cursor.close()
        return jsonify({"msg": "Department deleted successfully"}), 200
    except Exception as e:
        logger.exception("Failed to delete department")
        cursor.close()
        return jsonify({"msg": "Failed to delete department. Please try again."}), 500


@departments_bp.route('/<id>/members', methods=['GET'])
@jwt_required()
def get_department_members(id):
    """Get all accounts belonging to a department"""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check department exists
    cursor.execute("SELECT id, name FROM departments WHERE id = %s", (id,))
    dept = cursor.fetchone()
    if not dept:
        cursor.close()
        return jsonify({"msg": "Department not found"}), 404
    
    cursor.execute("""
        SELECT id, name, email, role, school_id, profile_picture, 
               suspended_at, created_at
        FROM accounts 
        WHERE department_id = %s AND deleted_at IS NULL
        ORDER BY name
    """, (id,))
    members = cursor.fetchall()
    cursor.close()
    
    return jsonify({
        "department": dept,
        "members": members,
        "count": len(members)
    }), 200


@departments_bp.route('/<id>/locations', methods=['GET'])
@jwt_required()
def get_department_locations(id):
    """Get all locations belonging to a department"""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check department exists
    cursor.execute("SELECT id, name FROM departments WHERE id = %s", (id,))
    dept = cursor.fetchone()
    if not dept:
        cursor.close()
        return jsonify({"msg": "Department not found"}), 404
    
    cursor.execute("""
        SELECT l.id, l.name, l.description, l.type, l.created_at,
               (SELECT COUNT(*) FROM computer_sets cs WHERE cs.location_id = l.id) as computer_set_count
        FROM locations l
        WHERE l.department_id = %s
        ORDER BY l.name
    """, (id,))
    locations = cursor.fetchall()
    cursor.close()
    
    return jsonify({
        "department": dept,
        "locations": locations,
        "count": len(locations)
    }), 200


@departments_bp.route('/<id>/stats', methods=['GET'])
@jwt_required()
def get_department_stats(id):
    """Get statistics for a department"""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check department exists
    cursor.execute("SELECT id, name, description FROM departments WHERE id = %s", (id,))
    dept = cursor.fetchone()
    if not dept:
        cursor.close()
        return jsonify({"msg": "Department not found"}), 404
    
    # Count members
    cursor.execute("""
        SELECT COUNT(*) as count FROM accounts 
        WHERE department_id = %s AND deleted_at IS NULL
    """, (id,))
    member_count = cursor.fetchone()['count']
    
    # Count locations
    cursor.execute("""
        SELECT COUNT(*) as count FROM locations WHERE department_id = %s
    """, (id,))
    location_count = cursor.fetchone()['count']
    
    # Count computer sets (through locations)
    cursor.execute("""
        SELECT COUNT(*) as count FROM computer_sets cs
        JOIN locations l ON cs.location_id = l.id
        WHERE l.department_id = %s
    """, (id,))
    computer_set_count = cursor.fetchone()['count']
    
    # Count components (through locations -> computer_sets)
    cursor.execute("""
        SELECT COUNT(*) as count FROM computer_set_components csc
        JOIN computer_sets cs ON csc.computer_set_id = cs.id
        JOIN locations l ON cs.location_id = l.id
        WHERE l.department_id = %s
    """, (id,))
    component_count = cursor.fetchone()['count']
    
    cursor.close()
    
    return jsonify({
        "department": dept,
        "stats": {
            "members": member_count,
            "locations": location_count,
            "computer_sets": computer_set_count,
            "components": component_count
        }
    }), 200

