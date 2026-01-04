from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from core.database import get_db
from utilities.decorators import role_required, verify_role_freshness
from utilities.security import hash_password
from utilities.account_activity import log_activity
from werkzeug.utils import secure_filename
import logging
import uuid
import os
import random
import string
from utilities.otp_store import otp_store
from core.email import email_service
from utilities.security import check_password, hash_password
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)

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
    cursor.execute("""
        SELECT a.id, a.name, a.email, a.school_id, a.role, a.suspended_at, a.deleted_at, 
               a.profile_picture, a.birth_date, a.gender, a.department_id, 
               d.name as department_name, a.password_reset_required, a.preferences 
        FROM accounts a
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE a.id = %s
    """, (current_user_id,))
    user = cursor.fetchone()
    cursor.close()
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    return jsonify({"user": user}), 200

@accounts_bp.route('/<id>/picture', methods=['GET'])
def get_profile_picture(id):
    # NOTE: No @jwt_required() - img tags cannot send Authorization headers
    # Profile pictures are considered low-sensitivity public content
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT profile_picture FROM accounts WHERE id = %s", (id,))
    user = cursor.fetchone()
    
    if not user or not user['profile_picture']:
        cursor.close()
        return jsonify({"msg": "No profile picture found"}), 404

    uploads_dir = os.path.join(os.getcwd(), 'uploads')
    file_path = os.path.join(uploads_dir, user['profile_picture'])
    
    if not os.path.exists(file_path):
        # Clean up orphaned DB reference
        try:
            cursor.execute("UPDATE accounts SET profile_picture = NULL WHERE id = %s", (id,))
            db.commit()
            logger.info(f"Cleaned up orphaned profile_picture reference for account {id}")
        except Exception as e:
            logger.error(f"Failed to clean up orphaned profile_picture: {e}")
        cursor.close()
        return jsonify({"msg": "Profile picture file missing", "cleared": True}), 404
    
    cursor.close()
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
            logger.exception("Failed to delete profile picture file")
            cursor.close()
            return jsonify({"msg": "Failed to delete file"}), 500
            
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
        from PIL import Image
        import io
        
        current_user_id = get_jwt_identity()
        
        # Always save as WebP for optimal compression
        unique_filename = f"{current_user_id}.webp"
        
        upload_folder = os.path.join(os.getcwd(), 'uploads', 'profile')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Delete any existing profile pictures for this user (handles extension changes)
        for existing_ext in ['png', 'jpg', 'jpeg', 'gif', 'webp']:
            old_file = os.path.join(upload_folder, f"{current_user_id}.{existing_ext}")
            if os.path.exists(old_file):
                try:
                    os.remove(old_file)
                    logger.info(f"Deleted old profile picture: {old_file}")
                except Exception as e:
                    logger.error(f"Failed to delete old profile picture: {e}")
        
        try:
            # Open image with Pillow
            img = Image.open(file)
            
            # Convert to RGB if necessary (for PNG with transparency, etc.)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparent images
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize to max 512x512 while maintaining aspect ratio
            max_size = (512, 512)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save as WebP with compression (quality 85 provides good balance)
            file_path = os.path.join(upload_folder, unique_filename)
            img.save(file_path, 'WEBP', quality=85, optimize=True)
            
            # Log file size
            file_size = os.path.getsize(file_path)
            logger.info(f"Saved profile picture: {file_path} ({file_size / 1024:.1f} KB)")
            
        except Exception as e:
            logger.exception("Failed to process image")
            return jsonify({"msg": "Failed to process image. Please try again."}), 500
        
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
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    
    data = request.json
    name = data.get('name')
    password = data.get('password')
    school_id = data.get('school_id')
    birth_date = data.get('birth_date')
    gender = data.get('gender')
    # department_id is managed by admin only via /accounts/<id> endpoint
    preferences = data.get('preferences')  # JSON object: {theme, toastPosition, seasonalEffects}
    
    if not any([name, password, school_id, birth_date, gender, preferences is not None]):
        return jsonify({"msg": "Nothing to update"}), 400
        
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Fetch current profile for comparison
        cursor.execute(
            "SELECT name, school_id, birth_date, gender FROM accounts WHERE id = %s",
            (current_user_id,)
        )
        current_profile = cursor.fetchone()
        
        fields = []
        values = []
        
        if name:
            fields.append("name = %s")
            values.append(name)
        
        # Only admin and head roles can update their own school_id
        if school_id is not None:
            if current_role not in ['admin', 'it_head', 'lab_head']:
                cursor.close()
                return jsonify({"msg": "Only administrators and head roles can update school ID"}), 403
            
            # Check if school_id already exists for another account
            cursor.execute("SELECT id FROM accounts WHERE school_id = %s AND id != %s", (school_id, current_user_id))
            if cursor.fetchone():
                cursor.close()
                return jsonify({"msg": "School ID already exists"}), 409
            
            fields.append("school_id = %s")
            values.append(school_id)
            
        if password:
            from utilities.user_validators import validate_password
            is_valid, error = validate_password(password)
            if not is_valid:
                 cursor.close()
                 return jsonify({"msg": error}), 400

            hashed_pw = hash_password(password)
            fields.append("password_hash = %s")
            values.append(hashed_pw)
            
            # Clear the reset flag
            fields.append("password_reset_required = %s")
            values.append(0)
        
        if birth_date:
            fields.append("birth_date = %s")
            values.append(birth_date)
        
        if gender:
            if gender not in ['male', 'female', 'others']:
                cursor.close()
                return jsonify({"msg": "Invalid gender value"}), 400
            fields.append("gender = %s")
            values.append(gender)
        
        if preferences is not None:
            import json
            # Store as JSON string
            fields.append("preferences = %s")
            values.append(json.dumps(preferences) if preferences else None)
            
        values.append(current_user_id)
        
        query = f"UPDATE accounts SET {', '.join(fields)} WHERE id = %s"
        cursor.execute(query, tuple(values))  
            
        db.commit()
        
        # Log profile update - track any fields that were provided for update
        update_details = {}
        if name:
            update_details['name_updated'] = True
        if school_id is not None:
            update_details['school_id_updated'] = True
        if password:
            update_details['password_changed'] = True
        if birth_date:
            update_details['birth_date_updated'] = True
        if gender:
            update_details['gender_updated'] = True

        
        # Always log activity if any field was submitted for update
        if update_details:
            log_activity(current_user_id, 'profile_updated', update_details)
        
        cursor.close()
        return jsonify({"msg": "Profile updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update profile")
        cursor.close()
        return jsonify({"msg": "Failed to update profile. Please try again."}), 500


@accounts_bp.route('/profile/password', methods=['PUT'])
@jwt_required()
def update_password():
    """Update password with current password verification."""
    current_user_id = get_jwt_identity()
    
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({"msg": "Current password and new password are required"}), 400
    
    # Validate new password
    from utilities.user_validators import validate_password
    is_valid, error = validate_password(new_password)
    if not is_valid:
        return jsonify({"msg": error}), 400
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Verify current password
        cursor.execute("SELECT password_hash FROM accounts WHERE id = %s", (current_user_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            return jsonify({"msg": "User not found"}), 404
        
        if not check_password(current_password, user['password_hash']):
            cursor.close()
            return jsonify({"msg": "Current password is incorrect"}), 401
        
        # Update password
        new_hash = hash_password(new_password)
        cursor.execute(
            "UPDATE accounts SET password_hash = %s, password_reset_required = 0 WHERE id = %s",
            (new_hash, current_user_id)
        )
        db.commit()
        
        # Log activity
        log_activity(current_user_id, 'password_changed')
        
        cursor.close()
        return jsonify({"msg": "Password updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update password")
        cursor.close()
        return jsonify({"msg": "Failed to update password. Please try again."}), 500


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

    # store OTP in memory with cooldown check
    # Key = uid_email_change, Data = new_email + action
    key = f"email_change:{current_user_id}"
    success, error = otp_store.set_otp(key, otp, data={'new_email': new_email, 'action': 'email_change'})
    if not success:
        return jsonify({"msg": error}), 429  # Too Many Requests

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

    # verify OTP (now returns 3 values: success, data, error_msg)
    key = f"email_change:{current_user_id}"
    success, data, error_msg = otp_store.verify_otp(key, otp)
    if not success:
        cursor.close()
        return jsonify({"msg": error_msg}), 400
    if data.get('action') != 'email_change':
        cursor.close()
        return jsonify({"msg": "Invalid OTP action"}), 400
    
    new_email = data.get('new_email')

    # update Email
    try:
        cursor.execute("UPDATE accounts SET email = %s WHERE id = %s", (new_email, current_user_id))
        db.commit()
        
        # Log email update
        log_activity(current_user_id, 'email_updated', {'new_email': new_email})
        
        cursor.close()
        return jsonify({"msg": "Email updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update email")
        cursor.close()
        return jsonify({"msg": "Failed to update email. Please try again."}), 500


@accounts_bp.route('/', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head', 'department_head'])
def create_account():
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    
    data = request.json
    name = data.get('name')
    email = data.get('email')
    school_id = data.get('school_id')
    password = data.get('password')
    role = data.get('role')
    birth_date = data.get('birth_date') or None
    gender = data.get('gender') or None
    department_id = data.get('department_id') or None
    
    # Enforce Department for Heads
    if current_role in ['it_head', 'lab_head', 'department_head']:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (get_jwt_identity(),))
        user_dept = cursor.fetchone()
        cursor.close()
        
        if user_dept and user_dept['department_id']:
            department_id = user_dept['department_id']
        else:
            return jsonify({"msg": "Your account is not assigned to a department, cannot create users"}), 403

    if not all([name, email, password, role]):
        return jsonify({"msg": "Missing required fields"}), 400
        
    # validation based on Hierarchy
    if current_role == 'it_head' and role != 'it_technician':
        return jsonify({"msg": "Protection Policy: IT Head can only create IT Technicians"}), 403
    if current_role == 'lab_head' and role != 'lab_assistant':
        return jsonify({"msg": "Protection Policy: Lab Head can only create Lab Assistants"}), 403
    if current_role == 'department_head' and role not in ['department_staff', 'department_assistant', 'lab_head', 'lab_assistant']:
        return jsonify({"msg": "Protection Policy: Department Head can only create Department Staff, Department Assistants, Lab Heads and Lab Assistants"}), 403
    
    # Policy: Only Admin can create Head roles
    if role in ['admin', 'it_head', 'lab_head'] and current_role != 'admin':
        return jsonify({"msg": "Protection Policy: Only Admin can create management roles"}), 403

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # check if email exists
    cursor.execute("SELECT id FROM accounts WHERE email = %s", (email,))
    if cursor.fetchone():
        cursor.close()
        return jsonify({"msg": "Email already exists"}), 409
    
    # check if school_id exists (only if provided)
    if school_id:
        cursor.execute("SELECT id FROM accounts WHERE school_id = %s", (school_id,))
        if cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "School ID already exists"}), 409

    account_id = uuid.uuid4().hex[:16]
    hashed_pw = hash_password(password)
    
    password_reset_required = 1 if data.get('password_reset_required') else 0

    try:
        cursor.execute(
            "INSERT INTO accounts (id, name, email, school_id, password_hash, role, birth_date, gender, department_id, password_reset_required) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (account_id, name, email, school_id or None, hashed_pw, role, birth_date, gender, department_id, password_reset_required)
        )
        db.commit()
        cursor.close()
        return jsonify({"msg": "Account created successfully", "id": account_id}), 201
    except Exception as e:
        logger.exception("Failed to create account")
        cursor.close()
        return jsonify({"msg": "Failed to create account. Please try again."}), 500


@accounts_bp.route('/', methods=['GET'])
@jwt_required()
@role_required(['admin', 'it_head', 'lab_head', 'department_head'])
def list_accounts():
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    current_user_id = get_jwt_identity()
    
    search = request.args.get('search', '')
    role = request.args.get('role', '')
    status = request.args.get('status', '')
    include_deleted = request.args.get('include_deleted', 'false').lower() == 'true'
    
    # Sorting parameters
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    
    # Validate sort_by to prevent SQL injection
    allowed_sort_fields = ['created_at', 'updated_at', 'name', 'email', 'school_id']
    if sort_by not in allowed_sort_fields:
        sort_by = 'created_at'
    
    # Validate sort_order
    if sort_order.lower() not in ['asc', 'desc']:
        sort_order = 'desc'

    query = """
        SELECT a.id, a.name, a.email, a.school_id, a.role, a.suspended_at, a.deleted_at, 
               a.created_at, a.updated_at, a.profile_picture, a.birth_date, a.gender, 
               a.department_id, d.name as department_name 
        FROM accounts a
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE a.id != %s
    """
    params = [current_user_id]

    allowed_to_view_deleted = ['admin', 'it_head', 'lab_head', 'department_head']
    if not include_deleted or current_role not in allowed_to_view_deleted:
         query += " AND a.deleted_at IS NULL"
    
    # RBAC Filtering
    if current_role == 'it_head':
        query += " AND a.role = %s"
        params.append('it_technician')
    elif current_role == 'lab_head':
        query += " AND a.role = %s"
        params.append('lab_assistant')
    elif current_role == 'department_head':
        placeholders = ','.join(['%s'] * 4)
        query += f" AND a.role IN ({placeholders})"
        params.extend(['department_staff', 'department_assistant', 'lab_head', 'lab_assistant'])

    # Department Filtering for Heads
    if current_role in ['it_head', 'lab_head', 'department_head']:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_user_id,))
        user_dept = cursor.fetchone()
        cursor.close()
        
        if user_dept and user_dept['department_id']:
             query += " AND a.department_id = %s"
             params.append(user_dept['department_id'])

    # User Filters
    if search:
        query += " AND (a.name LIKE %s OR a.email LIKE %s OR a.school_id LIKE %s OR a.role LIKE %s OR d.name LIKE %s)"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])
    
    # Role filter - supports comma-separated values for multi-select
    if role:
        roles = [r.strip() for r in role.split(',') if r.strip()]
        if roles:
            placeholders = ', '.join(['%s'] * len(roles))
            query += f" AND a.role IN ({placeholders})"
            params.extend(roles)
    
    # Status filter - supports comma-separated values for multi-select
    if status:
        statuses = [s.strip() for s in status.split(',') if s.strip()]
        status_conditions = []
        for s in statuses:
            if s == 'active':
                status_conditions.append("(suspended_at IS NULL AND deleted_at IS NULL)")
            elif s == 'suspended':
                status_conditions.append("suspended_at IS NOT NULL")
        if status_conditions:
            query += f" AND ({' OR '.join(status_conditions)})"
    
    # Dynamic sorting
    query += f" ORDER BY {sort_by} {sort_order.upper()}"
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute(query, tuple(params))
    accounts = cursor.fetchall()
    
    # Stats logic needs to respect visibility too
    # Simplify stats for Heads or filter stats? 
    # For now, let's filter the stats queries too to be consistent.
    
    stats_query = "SELECT role, COUNT(*) as count FROM accounts WHERE deleted_at IS NULL"
    stats_params = []
    
    if current_role == 'it_head':
        stats_query += " AND role = %s"
        stats_params.append('it_technician')
    elif current_role == 'lab_head':
        stats_query += " AND role = %s"
        stats_params.append('lab_assistant')
    elif current_role == 'department_head':
        placeholders = ','.join(['%s'] * 4)
        stats_query += f" AND role IN ({placeholders})"
        stats_params.extend(['department_staff', 'department_assistant', 'lab_head', 'lab_assistant'])
        
    stats_query += " GROUP BY role"
    
    cursor.execute(stats_query, tuple(stats_params))
    role_counts = {row['role']: row['count'] for row in cursor.fetchall()}
    
    cursor.close()
    
    return jsonify({
        "accounts": accounts,
        "stats": role_counts
    }), 200


@accounts_bp.route('/<id>', methods=['PUT'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head', 'department_head'])
def update_account(id):
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    current_id = get_jwt_identity()

    if current_id == id:
         return jsonify({"msg": "You cannot edit your own account permissions here"}), 403

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check existence and current role of target
    cursor.execute("SELECT role FROM accounts WHERE id = %s", (id,))
    target_account = cursor.fetchone()
    
    if not target_account:
        cursor.close()
        return jsonify({"msg": "Account not found"}), 404
        
    target_role = target_account['role']
    
    # RBAC Check: Cannot edit superiors or peers if not admin
    if current_role == 'it_head':
        if target_role != 'it_technician':
             cursor.close()
             return jsonify({"msg": "Access Denied: You can only manage IT Technicians"}), 403
             
    if current_role == 'lab_head':
        if target_role != 'lab_assistant':
             cursor.close()
             return jsonify({"msg": "Access Denied: You can only manage Lab Assistants"}), 403

    if current_role == 'department_head':
        if target_role not in ['department_staff', 'department_assistant', 'lab_head', 'lab_assistant']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You can only manage Department Staff, Assistants, Lab Heads, and Lab Assistants"}), 403

    # Department Verification for Heads
    if current_role in ['it_head', 'lab_head', 'department_head']:
        # Fetch current user's department
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_id,))
        current_user_dept = cursor.fetchone()
        
        # Check if target account is in the same department
        # We need to fetch target's department_id if not already fetched?
        # target_account only has 'role' fetched above. Let's fetch department_id too.
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (id,))
        target_details = cursor.fetchone()
        
        if not current_user_dept['department_id'] or current_user_dept['department_id'] != target_details['department_id']:
             cursor.close()
             return jsonify({"msg": "Access Denied: You can only manage accounts within your department"}), 403
             
    data = request.json
    
    # Build dynamic update query based on provided fields
    update_fields = []
    params = []
    
    if 'name' in data and data['name'] is not None:
        update_fields.append("name = %s")
        params.append(data['name'])
    
    if 'email' in data and data['email'] is not None:
        # check if email exists
        cursor.execute("SELECT id FROM accounts WHERE email = %s AND id != %s", (data['email'], id))
        if cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "Email already exists"}), 409
        update_fields.append("email = %s")
        params.append(data['email'])
    
    if 'school_id' in data and data['school_id'] is not None:
        # check if school_id exists
        cursor.execute("SELECT id FROM accounts WHERE school_id = %s AND id != %s", (data['school_id'], id))
        if cursor.fetchone():
            cursor.close()
            return jsonify({"msg": "School ID already exists"}), 409
        update_fields.append("school_id = %s")
        params.append(data['school_id'])
    
    if 'password' in data and data['password']:
        from utilities.user_validators import validate_password
        is_valid, error = validate_password(data['password'])
        if not is_valid:
             cursor.close()
             return jsonify({"msg": error}), 400
        hashed_pw = hash_password(data['password'])
        update_fields.append("password_hash = %s")
        params.append(hashed_pw)
    
    if 'role' in data and data['role'] is not None:
        new_role = data['role']
        
        # Validate role assignment based on current user's role
        allowed_roles = []
        if current_role == 'admin':
            allowed_roles = ['admin', 'it_head', 'it_technician', 'lab_head', 'lab_assistant', 'department_head', 'department_staff', 'department_assistant']
        elif current_role == 'it_head':
            allowed_roles = ['it_technician']
        elif current_role == 'lab_head':
            allowed_roles = ['lab_assistant']
        elif current_role == 'department_head':
            allowed_roles = ['department_staff', 'department_assistant', 'lab_head', 'lab_assistant']
        
        if new_role not in allowed_roles:
            cursor.close()
            return jsonify({"msg": f"You are not authorized to assign the role '{new_role}'"}), 403
        
        update_fields.append("role = %s")
        params.append(new_role)
    
    if 'suspended' in data:
        if data['suspended']:
            update_fields.append("suspended_at = NOW()")
        else:
            update_fields.append("suspended_at = NULL")
    
    if 'birth_date' in data:
        birth_date = data['birth_date'] or None
        # Sanitise birth_date if it comes in RFC 1123 format (Tue, 16 Dec...)
        if birth_date and ',' in str(birth_date):
            try:
                 dt = parsedate_to_datetime(birth_date)
                 birth_date = dt.strftime('%Y-%m-%d')
            except:
                 pass
        update_fields.append("birth_date = %s")
        params.append(birth_date)
    
    if 'gender' in data:
        update_fields.append("gender = %s")
        params.append(data['gender'] or None)
    
    if 'department_id' in data:
        if current_role != 'admin':
             cursor.close()
             return jsonify({"msg": "Only administrators can change department assignment"}), 403
        update_fields.append("department_id = %s")
        params.append(data['department_id'] or None)
    
    if 'password_reset_required' in data:
        password_reset_required = 1 if data['password_reset_required'] else 0
        update_fields.append("password_reset_required = %s")
        params.append(password_reset_required)

    if not update_fields:
        cursor.close()
        return jsonify({"msg": "No fields to update"}), 400

    try:
        # Get current account state for comparison
        cursor.execute("SELECT role, suspended_at FROM accounts WHERE id = %s", (id,))
        current_state = cursor.fetchone()
        
        query = f"UPDATE accounts SET {', '.join(update_fields)} WHERE id = %s"
        params.append(id)
        cursor.execute(query, tuple(params))
        db.commit()
        
        # Log activities based on what changed
        if 'role' in data and data['role'] != current_state['role']:
            log_activity(id, 'role_changed', {'old_role': current_state['role'], 'new_role': data['role']})
        
        if 'suspended' in data:
            if data['suspended'] and not current_state['suspended_at']:
                log_activity(id, 'suspended')
            elif not data['suspended'] and current_state['suspended_at']:
                log_activity(id, 'activated')
        
        if 'password' in data and data['password']:
            log_activity(id, 'password_changed')
        
        cursor.close()
        return jsonify({"msg": "Account updated successfully"}), 200
    except Exception as e:
        logger.exception("Failed to update account")
        cursor.close()
        return jsonify({"msg": "Failed to update account. Please try again."}), 500

@accounts_bp.route('/<id>', methods=['DELETE'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head', 'department_head'])
def delete_account(id):
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    current_user_id = get_jwt_identity()

    if current_user_id == id:
        return jsonify({"msg": "You cannot delete your own account"}), 403
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # check if exists, and role hirarchy
    cursor.execute("SELECT id, role, deleted_at, profile_picture, department_id FROM accounts WHERE id = %s", (id,))
    target_account = cursor.fetchone()
    
    if not target_account:
        cursor.close()
        return jsonify({"msg": "Account not found"}), 404
        
    # Hierarchy Checks
    if current_role == 'it_head' and target_account['role'] != 'it_technician':
        cursor.close()
        return jsonify({"msg": "IT Head can only delete IT Technicians"}), 403
    if current_role == 'lab_head' and target_account['role'] != 'lab_assistant':
        cursor.close()
        return jsonify({"msg": "Lab Head can only delete Lab Assistants"}), 403
    if current_role == 'department_head':
        allowed_targets = ['department_staff', 'department_assistant', 'lab_head', 'lab_assistant']
        if target_account['role'] not in allowed_targets:
             cursor.close()
             return jsonify({"msg": "Department Head can only delete Department Staff/Assistants and Lab Heads/Assistants"}), 403
        
        # Check Department
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_user_id,))
        me = cursor.fetchone()
        if not me or me['department_id'] != target_account['department_id']:
             cursor.close()
             return jsonify({"msg": "You can only delete accounts in your department"}), 403

    if target_account['role'] == 'admin':
         cursor.execute("SELECT COUNT(*) as count FROM accounts WHERE role = 'admin' AND deleted_at IS NULL")
         result = cursor.fetchone()
         if result['count'] <= 1:
             cursor.close()
             return jsonify({"msg": "Cannot delete the only admin account"}), 400

    force = request.args.get('force', 'false').lower() == 'true'

    try:
        if force:
             if current_role not in ['admin', 'it_head', 'department_head']:
                  cursor.close()
                  return jsonify({"msg": "Only Admin, IT Head, and Department Head can permanently delete accounts"}), 403

             # check if profile picture exists and delete it
             if target_account.get('profile_picture'):
                 uploads_dir = os.path.join(os.getcwd(), 'uploads')
                 file_path = os.path.join(uploads_dir, target_account['profile_picture'])
                 if os.path.exists(file_path):
                     try:
                         os.remove(file_path)
                     except Exception as e:
                         logger.warning(f"Failed to delete profile picture file: {str(e)}")

             cursor.execute("DELETE FROM accounts WHERE id = %s", (id,))
             msg = "Account permanently deleted"
             log_activity(current_user_id, 'deleted', {'target_id': id, 'type': 'hard_delete'})
        else:
            # Soft delete
            if target_account['deleted_at']:
                cursor.close()
                return jsonify({"msg": "Account is already deleted"}), 400

            cursor.execute("UPDATE accounts SET deleted_at = NOW() WHERE id = %s", (id,))
            msg = "Account soft deleted successfully"
            log_activity(current_user_id, 'deleted', {'target_id': id, 'type': 'soft_delete'})

        db.commit()
        cursor.close()
        return jsonify({"msg": msg}), 200
    except Exception as e:
        logger.exception("Failed to delete account")
        cursor.close()
        return jsonify({"msg": "Failed to delete account. Please try again."}), 500


@accounts_bp.route('/<id>/restore', methods=['POST'])
@jwt_required()
@verify_role_freshness
@role_required(['admin', 'it_head', 'lab_head', 'department_head'])
def restore_account(id):
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    current_user_id = get_jwt_identity()

    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    # Check if account exists and is deleted
    cursor.execute("SELECT id, name, role, deleted_at, department_id FROM accounts WHERE id = %s", (id,))
    target = cursor.fetchone()
    
    if not target:
        cursor.close()
        return jsonify({"msg": "Account not found"}), 404
        
    if not target['deleted_at']:
        cursor.close()
        return jsonify({"msg": "Account is not deleted"}), 400
        
    # Hierarchy Checks (Copy of delete logic)
    if current_role == 'it_head' and target['role'] != 'it_technician':
        cursor.close()
        return jsonify({"msg": "Access Denied"}), 403
    if current_role == 'lab_head' and target['role'] != 'lab_assistant':
        cursor.close()
        return jsonify({"msg": "Access Denied"}), 403
    if current_role == 'department_head':
        allowed_targets = ['department_staff', 'department_assistant', 'lab_head', 'lab_assistant']
        if target['role'] not in allowed_targets:
             cursor.close()
             return jsonify({"msg": "Access Denied"}), 403
        
        # Check Department
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_user_id,))
        me = cursor.fetchone()
        if not me or me['department_id'] != target['department_id']:
             cursor.close()
             return jsonify({"msg": "Access Denied"}), 403
    
    try:
        cursor.execute("UPDATE accounts SET deleted_at = NULL WHERE id = %s", (id,))
        db.commit()
        cursor.close()
        log_activity(current_user_id, 'restored', {'target_id': id})
        return jsonify({"msg": f"Account '{target['name']}' restored successfully"}), 200
        cursor.close()
        log_activity(id, 'restored')
        return jsonify({"msg": f"Account '{account['name']}' restored successfully"}), 200
    except Exception as e:
        logger.exception("Failed to restore account")
        cursor.close()
        return jsonify({"msg": "Failed to restore account. Please try again."}), 500


@accounts_bp.route('/<id>/activities', methods=['GET'])
@jwt_required()
def get_account_activities(id):
    """Get account activities for the specified account."""
    current_user_id = get_jwt_identity()
    current_claims = get_jwt()
    current_role = current_claims.get("role")
    
    # RBAC: Allow Admins, or Managers viewing their subordinates
    # Check if target account is within my management scope
    
    # Simple self-check
    if id == current_user_id:
        pass # Allow
    elif current_role == 'admin':
        pass # Allow
    elif current_role == 'it_head':
        # Check if target is it_technician
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT role FROM accounts WHERE id = %s", (id,))
        target = cursor.fetchone()
        cursor.close()
        if not target or target['role'] != 'it_technician':
            return jsonify({"msg": "Access denied"}), 403
            
    elif current_role == 'lab_head':
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT role, department_id FROM accounts WHERE id = %s", (id,))
        target = cursor.fetchone()
        
        # Also check department match
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_user_id,))
        me = cursor.fetchone()
        cursor.close()
        
        if not target or target['role'] != 'lab_assistant' or target['department_id'] != me['department_id']:
            return jsonify({"msg": "Access denied"}), 403

    elif current_role == 'department_head':
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT role, department_id FROM accounts WHERE id = %s", (id,))
        target = cursor.fetchone()
        
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT department_id FROM accounts WHERE id = %s", (current_user_id,))
        me = cursor.fetchone()
        cursor.close()
        
        allowed_targets = ['department_staff', 'department_assistant', 'lab_head', 'lab_assistant']
        if not target or target['role'] not in allowed_targets or target['department_id'] != me['department_id']:
            return jsonify({"msg": "Access denied"}), 403
    else:
         return jsonify({"msg": "Access denied"}), 403
    
    limit = request.args.get('limit', 20, type=int)
    limit = min(limit, 100)  # Max 100 items
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT id, action, details, ip_address, created_at 
            FROM account_activities 
            WHERE account_id = %s 
            ORDER BY created_at DESC 
            LIMIT %s
        """, (id, limit))
        activities = cursor.fetchall()
        cursor.close()
        
        # Parse JSON details
        import json
        for activity in activities:
            if activity['details']:
                try:
                    activity['details'] = json.loads(activity['details'])
                except:
                    pass
            # Convert datetime to ISO format with UTC indicator
            if activity['created_at']:
                activity['created_at'] = activity['created_at'].isoformat() + 'Z'
        
        return jsonify({"activities": activities}), 200
    except Exception as e:
        logger.exception("Failed to get account activities")
        cursor.close()
        return jsonify({"msg": "Failed to get activities. Please try again."}), 500


