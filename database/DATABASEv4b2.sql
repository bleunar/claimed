CREATE TABLE departments (
    id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    name VARCHAR(255) not null,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
    id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    birth_date DATE NULL,
    gender ENUM('male', 'female', 'others') NULL,
    department_id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL, 
    role ENUM('admin', 'it_head', 'it_technician', 'department_head', 'department_staff', 'lab_head', 'lab_assistant') NOT NULL,
    school_id VARCHAR(24) UNIQUE NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password_reset_required BOOLEAN DEFAULT FALSE, 
    suspended_at TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    profile_picture VARCHAR(255) NULL,
    preferences JSON NULL COMMENT 'User preferences: {theme, toastPosition, seasonalEffects}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE account_activities (
    id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    account_id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    action ENUM('login', 'logout', 'password_reset', 'password_changed', 
                'email_updated', 'school_id_updated', 'role_changed', 
                'suspended', 'activated', 'deleted', 'restored', 'profile_updated') NOT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_account_time (account_id, created_at DESC)
);

CREATE TABLE locations (
    id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    type ENUM('office', 'laboratory', 'kiosk', 'others'),
    department_id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE computer_sets (
    id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    location_id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    set_name VARCHAR(50) NOT NULL,
    status ENUM('active', 'maintenance') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE TABLE computer_set_components (
    id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    computer_set_id CHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL,
    component_type ENUM('monitor', 'system_unit', 'keyboard', 'mouse', 'avr', 'web_camera', 'printer', 'headset', 'other') NOT NULL,
    is_core BOOLEAN DEFAULT TRUE,
    brand_name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100), 
    properties JSON NULL,
    status ENUM('good', 'bad', 'maintenance', 'missing') DEFAULT 'good',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (computer_set_id) REFERENCES computer_sets(id) ON DELETE SET NULL,
    INDEX idx_serial (serial_number)
);