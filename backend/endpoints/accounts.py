from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from core.database import get_db
from utilities.decorators import role_required
from utilities.security import hash_password
from werkzeug.utils import secure_filename
import uuid
import os
import random
import string
from utilities.otp_store import otp_store
from core.email import email_service
from utilities.security import check_password, hash_password

# profile picture uploads
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS



accounts_bp = Blueprint('accounts', __name__, url_prefix='/accounts')

@accounts_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    current_user_id = get_jwt_identity()
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, name, email, role, status, profile_picture, birth_date, gender, department_name FROM accounts WHERE id = %s", (current_user_id,))
    user = cursor.fetchone()
    cursor.close()
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    return jsonify({"user": user}), 200

@accounts_bp.route('/<id>/picture', methods=['GET'])
def get_profile_picture(id):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT profile_picture FROM accounts WHERE id = %s", (id,))
    user = cursor.fetchone()
    cursor.close()
    
    if not user or not user['profile_picture']:
        return jsonify({"msg": "No profile picture found"}), 404

    uploads_dir = os.path.join(os.getcwd(), 'uploads')
    file_path = os.path.join(uploads_dir, user['profile_picture'])
    
    if not os.path.exists(file_path):
        return jsonify({"msg": "Profile picture file missing"}), 404
        
    return send_from_directory(uploads_dir, user['profile_picture'])

@accounts_bp.route('/<id>/picture', methods=['DELETE'])
@jwt_required()
def delete_profile_picture(id):
    current_claims = get_jwt()
    current_user_id = get_jwt_identity()
    current_role = current_claims.get("role")
    
    # Permission check: Self or Hierarchical Superior
    allowed = False
    if current_user_id == id:
        allowed = True
    elif current_role in ['admin', 'it_head', 'lab_head']:
        # Check target role
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT role FROM accounts WHERE id = %s", (id,))
        target = cursor.fetchone()
        cursor.close()
        
        if target:
            target_role = target['role']
            if current_role == 'admin':
                allowed = True
            elif current_role == 'it_head' and target_role in ['it_technician', 'lab_head', 'lab_assistant']:
                allowed = True
            elif current_role == 'lab_head' and target_role == 'lab_assistant':
                allowed = True
    
    if not allowed:
        return jsonify({"msg": "Permission denied"}), 403

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("SELECT profile_picture FROM accounts WHERE id = %s", (id,))
    user = cursor.fetchone()
    
    if not user or not user['profile_picture']:
        cursor.close()
        return jsonify({"msg": "No profile picture to delete"}), 404
        
    # Delete file
    uploads_dir = os.path.join(os.getcwd(), 'uploads')
    file_path = os.path.join(uploads_dir, user['profile_picture'])
    
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            cursor.close()
            return jsonify({"msg": f"Failed to delete file: {str(e)}"}), 500
            
    # Update DB
    cursor.execute("UPDATE accounts SET profile_picture = NULL WHERE id = %s", (id,))
    db.commit()
    cursor.close()
    
    return jsonify({"msg": "Profile picture deleted successfully"}), 200


@accounts_bp.route('/profile/upload-picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    if 'file' not in request.files:
        return jsonify({"msg": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        # use account's id as file name
        current_user_id = get_jwt_identity()
        extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{current_user_id}.{extension}"
        
        upload_folder = os.path.join(os.getcwd(), 'uploads', 'profile')
        os.makedirs(upload_folder, exist_ok=True)
        
        file.save(os.path.join(upload_folder, unique_filename))
        
        db = get_db()
        cursor = db.cursor()
                
        relative_path = f"profile/{unique_filename}"
        cursor.execute("UPDATE accounts SET profile_picture = %s WHERE id = %s", (relative_path, current_user_id))
        db.commit()
        cursor.close()
        
        return jsonify({"msg": "Profile picture uploaded successfully", "path": relative_path}), 200
        
    return jsonify({"msg": "File type not allowed"}), 400


@accounts_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    data = request.json
    name = data.get('name')
    password = data.get('password')
    
    if not name and not password:
        return jsonify({"msg": "Nothing to update"}), 400
        
    db = get_db()
    cursor = db.cursor()
    
    try:
        fields = []
        values = []
        
        if name:
            fields.append("name = %s")
            values.append(name)
            
        if password:
            hashed_pw = hash_password(password)
            fields.append("password_hash = %s")
            values.append(hashed_pw)
            
        values.append(current_user_id)
        
        query = f"UPDATE accounts SET {', '.join(fields)} WHERE id = %s"
        cursor.execute(query, tuple(values))  
            
        db.commit()
        cursor.close()
        return jsonify({"msg": "Profile updated successfully"}), 200
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to update profile: {str(e)}"}), 500


@accounts_bp.route('/profile/email/request', methods=['POST'])
@jwt_required()
def request_email_change():
    current_user_id = get_jwt_identity()
    new_email = request.json.get('new_email')

    if not new_email:
        return jsonify({"msg": "New email is required"}), 400

    # check if email is already taken
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id FROM accounts WHERE email = %s", (new_email,))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Email already in use"}), 409
    cursor.close()

    # generate OTP
    otp = ''.join(random.choices(string.digits, k=6))

    # store OTP in memory
    # Key = uid_email_change, Data = new_email
    key = f"email_change:{current_user_id}"
    otp_store.set_otp(key, otp, data={'new_email': new_email})

    # send Email to NEW email
    email_service.send_otp_email(new_email, otp, action="Email Change")

    return jsonify({"msg": "OTP sent to new email address"}), 200


@accounts_bp.route('/profile/email/confirm', methods=['POST'])
@jwt_required()
def confirm_email_change():
    current_user_id = get_jwt_identity()
    otp = request.json.get('otp')
    password = request.json.get('password')

    if not otp or not password:
        return jsonify({"msg": "OTP and current password are required"}), 400

    # verify Password
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT password_hash FROM accounts WHERE id = %s", (current_user_id,))
    user = cursor.fetchone()
    
    if not user or not check_password(password, user['password_hash']):
        cursor.close()
        return jsonify({"msg": "Invalid password"}), 401

    # verify OTP
    key = f"email_change:{current_user_id}"
    success, data = otp_store.verify_otp(key, otp)
    if not success:
        cursor.close()
        return jsonify({"msg": "Invalid or expired OTP"}), 400
    
    new_email = data.get('new_email')

    # update Email
    try:
        cursor.execute("UPDATE accounts SET email = %s WHERE id = %s", (new_email, current_user_id))
        db.commit()
        cursor.close()
        return jsonify({"msg": "Email updated successfully"}), 200
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to update email: {str(e)}"}), 500


@accounts_bp.route('/', methods=['POST'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def create_account():
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not all([name, email, password, role]):
        return jsonify({"msg": "Missing required fields"}), 400
        
    # validation based on Hierarchy
    if current_role == 'it_head' and role != 'it_technician':
        return jsonify({"msg": "IT Head can only create IT Technicians"}), 403
    if current_role == 'lab_head' and role != 'lab_assistant':
        return jsonify({"msg": "Lab Head can only create Lab Assistants"}), 403

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # check single admin rule
    if role == 'admin':
        cursor.execute("SELECT COUNT(*) as count FROM accounts WHERE role = 'admin' AND status != 'deleted'")
        result = cursor.fetchone()
        if result['count'] >= 1:
            cursor.close()
            return jsonify({"msg": "Only one admin account allowed"}), 400
    
    # check if email exists
    cursor.execute("SELECT id FROM accounts WHERE email = %s", (email,))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Email already exists"}), 409

    account_id = uuid.uuid4().hex[:16]
    hashed_pw = hash_password(password)
    
    try:
        cursor.execute(
            "INSERT INTO accounts (id, name, email, password_hash, role) VALUES (%s, %s, %s, %s, %s)",
            (account_id, name, email, hashed_pw, role)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Account created successfully", "id": account_id}), 201
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to create account: {str(e)}"}), 500


@accounts_bp.route('/', methods=['GET'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def list_accounts():
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    
    search = request.args.get('search', '')
    role = request.args.get('role', '')
    status = request.args.get('status', '')
    include_deleted = request.args.get('include_deleted', 'false').lower() == 'true'

    query = "SELECT id, name, email, role, status, created_at, profile_picture FROM accounts WHERE 1=1"
    params = []

    if not include_deleted or current_role != 'admin':
         query += " AND status != 'deleted'"
    
    # filter by head role
    if current_role == 'it_head':
        query += " AND role = 'it_technician'"
    elif current_role == 'lab_head':
        query += " AND role = 'lab_assistant'"

    if search:
        query += " AND (name LIKE %s OR email LIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])

    if role:
        query += " AND role = %s"
        params.append(role)

    if status:
        query += " AND status = %s"
        params.append(status)

    query += " ORDER BY created_at DESC"

    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(query, tuple(params))
    accounts = cursor.fetchall()
    cursor.close()
    return jsonify(accounts), 200


@accounts_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def update_account(id):
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    status = data.get('status')

    if not all([name, email, role, status]):
        return jsonify({"msg": "Name, Email, Role, and Status are required"}), 400

    # validation based on role
    if current_role == 'it_head' and role != 'it_technician':
        return jsonify({"msg": "IT Head can only manage IT Technicians"}), 403
    if current_role == 'lab_head' and role != 'lab_assistant':
        return jsonify({"msg": "Lab Head can only manage Lab Assistants"}), 403

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # check if exists and validate hierarchy access to target
    cursor.execute("SELECT id, role FROM accounts WHERE id = %s", (id,))
    target_account = cursor.fetchone()
    
    if not target_account:
        cursor.close()
        return jsonify({"msg": "Account not found"}), 404
        
    if current_role == 'it_head' and target_account['role'] != 'it_technician':
        cursor.close()
        return jsonify({"msg": "IT Head can only update IT Technicians"}), 403
    if current_role == 'lab_head' and target_account['role'] != 'lab_assistant':
        cursor.close()
        return jsonify({"msg": "Lab Head can only update Lab Assistants"}), 403

    # check single admin rule
    if role == 'admin' and target_account['role'] != 'admin':
        cursor.execute("SELECT COUNT(*) as count FROM accounts WHERE role = 'admin' AND status != 'deleted'")
        result = cursor.fetchone()
        if result['count'] >= 1:
            cursor.close()
            return jsonify({"msg": "Only one admin account allowed"}), 400

    # check if email exists
    cursor.execute("SELECT id FROM accounts WHERE email = %s AND id != %s", (email, id))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Email already exists"}), 409

    try:
        if password:
            hashed_pw = hash_password(password)
            cursor.execute(
                "UPDATE accounts SET name = %s, email = %s, password_hash = %s, role = %s, status = %s WHERE id = %s",
                (name, email, hashed_pw, role, status, id)
            )
        else:
            cursor.execute(
                "UPDATE accounts SET name = %s, email = %s, role = %s, status = %s WHERE id = %s",
                (name, email, role, status, id)
            )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Account updated successfully"}), 200
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to update account: {str(e)}"}), 500

@accounts_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head'])
def delete_account(id):
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # check if exists, and role hirarchy
    cursor.execute("SELECT id, role FROM accounts WHERE id = %s", (id,))
    target_account = cursor.fetchone()
    
    if not target_account:
        cursor.close()
        return jsonify({"msg": "Account not found"}), 404
        
    if current_role == 'it_head' and target_account['role'] != 'it_technician':
        cursor.close()
        return jsonify({"msg": "IT Head can only delete IT Technicians"}), 403
    if current_role == 'lab_head' and target_account['role'] != 'lab_assistant':
        cursor.close()
        return jsonify({"msg": "Lab Head can only delete Lab Assistants"}), 403

    if target_account['role'] == 'admin':
         cursor.execute("SELECT COUNT(*) as count FROM accounts WHERE role = 'admin' AND status != 'deleted'")
         result = cursor.fetchone()
         if result['count'] <= 1:
             cursor.close()
             return jsonify({"msg": "Cannot delete the only admin account"}), 400

    hard = request.args.get('hard', 'false').lower() == 'true'

    try:
        if hard and current_role == 'admin':
             # check if profile picture exists and delete it
             if target_account.get('profile_picture'):
                 uploads_dir = os.path.join(os.getcwd(), 'uploads')
                 file_path = os.path.join(uploads_dir, target_account['profile_picture'])
                 if os.path.exists(file_path):
                     try:
                         os.remove(file_path)
                     except Exception as e:
                         print(f"Failed to delete profile picture file: {str(e)}") # Log but continue

             cursor.execute("DELETE FROM accounts WHERE id = %s", (id,))
             msg = "Account permanently deleted"
        else:
            # Soft delete
            cursor.execute("UPDATE accounts SET status = 'deleted', deleted_at = NOW() WHERE id = %s", (id,))
            msg = "Account deleted successfully"

        db.commit()
        cursor.close()
        return jsonify({"msg": msg}), 200
    except Exception as e:
        cursor.close()
        return jsonify({"msg": f"Failed to delete account: {str(e)}"}), 500
