from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

from core.database import get_db
from utilities.security import check_password, hash_password
from utilities.otp_store import otp_store
from utilities.account_activity import log_activity
from core.email import email_service
import logging
import random
import string
from core.extensions import limiter

logger = logging.getLogger(__name__)

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("30 per minute")
def login():
    email = request.json.get('email', None)
    password = request.json.get('password', None)
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM accounts WHERE email = %s OR school_id = %s", (email, email))
    user = cursor.fetchone()
    cursor.close()

    if user and check_password(password, user['password_hash']):
        if user['suspended_at'] is not None:
            return jsonify({"msg": "Account is suspended"}), 403
        if user['deleted_at'] is not None:
             return jsonify({"msg": "Bad email or password"}), 401
             
        from flask_jwt_extended import set_refresh_cookies
        
        additional_claims = {"role": user['role']}
        access_token = create_access_token(identity=user['id'], additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=user['id'])
        
        resp = jsonify({"access_token": access_token})
        set_refresh_cookies(resp, refresh_token)
        
        # Log login activity
        log_activity(user['id'], 'login')
        
        return resp, 200
    
    return jsonify({"msg": "Bad email or password"}), 401

@auth_bp.route('/logout', methods=['POST'])
@jwt_required(optional=True)
def logout():
    from flask_jwt_extended import unset_jwt_cookies, get_jwt_identity
    
    # Log logout activity if user is authenticated
    identity = get_jwt_identity()
    if identity:
        log_activity(identity, 'logout')
    
    resp = jsonify({"msg": "Logout successful"})
    unset_jwt_cookies(resp)
    return resp, 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT suspended_at, deleted_at, role FROM accounts WHERE id = %s", (identity,))
    user = cursor.fetchone()
    cursor.close()
    
    if not user or user['suspended_at'] is not None or user['deleted_at'] is not None:
        return jsonify({"msg": "Account is not active"}), 401
        
    additional_claims = {"role": user['role']}
    access_token = create_access_token(identity=identity, additional_claims=additional_claims)
    return jsonify(access_token=access_token), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    return jsonify({"message": "Register endpoint"}), 200

@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("30 per minute")
def forgot_password():
    email = request.json.get('email')
    if not email:
        return jsonify({"msg": "Email is required"}), 400

    # 1. check if user exists
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id FROM accounts WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()

    if not user:
        return jsonify({"msg": "OTP has been sent to your email"}), 200

    # 2. Generate OTP
    otp = ''.join(random.choices(string.digits, k=6))

    # 3. store OTP in memory 
    # Key: email, Action: reset_password
    otp_store.set_otp(email, otp, data={'action': 'reset_password'})

    # send email
    email_service.send_otp_email(email, otp, action="Password Reset")

    return jsonify({"msg": "OTP has been sent to your email"}), 200

@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit("30 per minute")
def reset_password():
    email = request.json.get('email')
    otp = request.json.get('otp')
    new_password = request.json.get('new_password')

    if not email or not otp or not new_password:
        return jsonify({"msg": "Email, OTP, and new password are required"}), 400

    from utilities.user_validators import validate_password
    is_valid, error = validate_password(new_password)
    if not is_valid:
        return jsonify({"msg": error}), 400

    # verify OTP
    success, data = otp_store.verify_otp(email, otp)
    if not success or data.get('action') != 'reset_password':
        return jsonify({"msg": "Invalid or expired OTP"}), 400
    
    # update password
    password_hash = hash_password(new_password)
    
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("UPDATE accounts SET password_hash = %s WHERE email = %s", (password_hash, email))
        db.commit()
        
        # Get account ID and log activity
        cursor.execute("SELECT id FROM accounts WHERE email = %s", (email,))
        account = cursor.fetchone()
        if account:
            log_activity(account['id'], 'password_reset')
        
        cursor.close()
        return jsonify({"msg": "Password reset successfully"}), 200
    except Exception as e:
        logger.exception("Failed to reset password")
        cursor.close()
        return jsonify({"msg": f"Failed to reset password: {str(e)}"}), 500
