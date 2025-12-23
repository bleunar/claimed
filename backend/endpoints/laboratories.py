from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from core.database import get_db
from utilities.decorators import role_required, verify_role_freshness
import logging
import uuid

logger = logging.getLogger(__name__)

laboratories_bp = Blueprint('laboratories', __name__, url_prefix='/laboratories')

@laboratories_bp.route('/', methods=['GET'])
@jwt_required()
def list_laboratories():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, name, description, location, created_at, updated_at FROM laboratories")
    laboratories = cursor.fetchall()
    cursor.close()
    return jsonify(laboratories), 200

@laboratories_bp.route('/<id>', methods=['GET'])
@jwt_required()
def get_laboratory(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, name, description, location, created_at, updated_at FROM laboratories WHERE id = %s", (id,))
    laboratory = cursor.fetchone()
    cursor.close()
    
    if not laboratory:
        return jsonify({"msg": "Laboratory not found"}), 404
        
    return jsonify(laboratory), 200

@laboratories_bp.route('/', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head'])
def create_laboratory():
    data = request.json
    name = data.get('name')
    description = data.get('description')
    location = data.get('location')

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)

    # Check for duplicate name
    cursor.execute("SELECT id FROM laboratories WHERE name = %s", (name,))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Laboratory name already exists"}), 409
    
    try:
        lab_id = uuid.uuid4().hex[:16]
        cursor.execute(
            "INSERT INTO laboratories (id, name, description, location) VALUES (%s, %s, %s, %s)",
            (lab_id, name, description, location)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Laboratory created successfully", "id": lab_id}), 201
    except Exception as e:
        logger.exception("Failed to create laboratory")
        cursor.close()
        return jsonify({"msg": "Failed to create laboratory. Please try again."}), 500

@laboratories_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head'])
def update_laboratory(id: str):
    data = request.json
    name = data.get('name', '')
    description = data.get('description', '')
    location = data.get('location', '')

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id, name, description, location FROM laboratories WHERE id = %s", (id,))
    existing_lab = cursor.fetchone()
    if not existing_lab:
        cursor.close()
        return jsonify({"msg": "Laboratory not found"}), 404

    try:
        cursor.execute(
            "UPDATE laboratories SET name = %s, description = %s, location = %s WHERE id = %s",
            (name, description, location, id)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Laboratory updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update laboratory")
        cursor.close()
        return jsonify({"msg": "Failed to update laboratory. Please try again."}), 500

@laboratories_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head'])
def delete_laboratory(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if exists
    cursor.execute("SELECT id FROM laboratories WHERE id = %s", (id,))
    if not cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Laboratory not found"}), 404

    try:
        cursor.execute("DELETE FROM laboratories WHERE id = %s", (id,))
        db.commit()
        cursor.close()
        return jsonify({"msg": "Laboratory deleted successfully"}), 200
    except Exception as e:
        logger.exception("Failed to delete laboratory")
        cursor.close()
        return jsonify({"msg": "Failed to delete laboratory. Please try again."}), 500
