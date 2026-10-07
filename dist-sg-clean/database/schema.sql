-- =====================================================================
-- Company Laptop Tracking & Management System (CLTMS)
-- Database Schema for MySQL 8.0+
-- =====================================================================

CREATE DATABASE IF NOT EXISTS db2ly7u58ix9e5
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db2ly7u58ix9e5;

-- ---------------------------------------------------------------------
-- 1. Users Table (Admin, IT Admin, Manager, Viewer)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'it_admin', 'manager', 'viewer', 'laptop_owner') NOT NULL DEFAULT 'viewer',
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Departments Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  budget_allocated DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dept_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Employees Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(50) NULL,
  department_id INT NULL,
  branch VARCHAR(100) DEFAULT 'Headquarters',
  position VARCHAR(100) NULL,
  status ENUM('active', 'inactive', 'on_leave', 'terminated') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_dept FOREIGN KEY (department_id) 
    REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_employee_id (employee_id),
  INDEX idx_employee_email (email),
  INDEX idx_employee_dept (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. Enrollment Tokens Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollment_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  uses_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_by INT NULL,
  status ENUM('active', 'exhausted', 'revoked', 'expired') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_enroll_created_by FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_enroll_token (token),
  INDEX idx_enroll_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. Devices Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL UNIQUE,          -- Hardware UUID / Generated unique ID
  asset_id VARCHAR(50) NOT NULL UNIQUE,           -- Company Asset Tag e.g. SG-LAP-001
  name VARCHAR(120) NOT NULL,
  hostname VARCHAR(120) NOT NULL,
  manufacturer VARCHAR(80) NOT NULL,
  model VARCHAR(120) NOT NULL,
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  os VARCHAR(50) NOT NULL,                        -- Windows, macOS, Linux
  os_version VARCHAR(100) NULL,
  architecture VARCHAR(30) DEFAULT 'x64',
  cpu_model VARCHAR(150) NULL,
  ram_total_gb DECIMAL(6,2) DEFAULT 0,
  storage_total_gb DECIMAL(8,2) DEFAULT 0,
  
  -- Assignments
  employee_id INT NULL,
  department_id INT NULL,
  branch VARCHAR(100) DEFAULT 'Headquarters',
  assigned_date DATETIME NULL,

  -- Status tracking
  status ENUM('online', 'offline', 'maintenance', 'deactivated') NOT NULL DEFAULT 'offline',
  asset_status ENUM('available', 'assigned', 'maintenance', 'lost', 'retired') NOT NULL DEFAULT 'available',
  
  -- Asset procurement
  purchase_date DATE NULL,
  warranty_expiry DATE NULL,
  purchase_price DECIMAL(10,2) DEFAULT 0.00,
  supplier VARCHAR(100) NULL,
  
  -- Live telemetry summary (updated on heartbeat)
  public_ip VARCHAR(45) NULL,
  local_ip VARCHAR(45) NULL,
  mac_address VARCHAR(50) NULL,
  battery_percent INT DEFAULT 100,
  battery_status VARCHAR(30) DEFAULT 'Plugged In',
  cpu_usage DECIMAL(5,2) DEFAULT 0.00,
  ram_usage DECIMAL(5,2) DEFAULT 0.00,
  disk_usage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Auth & Tracking
  device_token VARCHAR(128) NULL UNIQUE,          -- Secure auth token for agent API
  agent_installed_at DATETIME NULL,
  agent_allowed TINYINT(1) NOT NULL DEFAULT 1,
  enrollment_token_id INT NULL,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_devices_employee FOREIGN KEY (employee_id) 
    REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT fk_devices_dept FOREIGN KEY (department_id) 
    REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_devices_enrollment FOREIGN KEY (enrollment_token_id)
    REFERENCES enrollment_tokens(id) ON DELETE SET NULL,

  INDEX idx_device_id (device_id),
  INDEX idx_asset_id (asset_id),
  INDEX idx_device_status (status),
  INDEX idx_device_last_seen (last_seen),
  INDEX idx_device_employee (employee_id),
  INDEX idx_device_dept (department_id),
  INDEX idx_device_token (device_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. Device Heartbeats Table (Historical telemetry records)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_heartbeats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ram_usage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  disk_usage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  battery_percent INT NOT NULL DEFAULT 100,
  battery_status VARCHAR(30) DEFAULT 'Plugged In',
  public_ip VARCHAR(45) NULL,
  local_ip VARCHAR(45) NULL,
  status VARCHAR(20) DEFAULT 'online',
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_heartbeats_device FOREIGN KEY (device_id) 
    REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_hb_device_time (device_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. Device Locations Table (Responsible approximate IP geolocation)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  public_ip VARCHAR(45) NOT NULL,
  city VARCHAR(100) NULL,
  region VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  country_code VARCHAR(10) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  isp VARCHAR(150) NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_locations_device FOREIGN KEY (device_id) 
    REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_loc_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. Device Assignments History Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  employee_id INT NULL,
  department_id INT NULL,
  assigned_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_date DATETIME NULL,
  assigned_by INT NULL,
  notes VARCHAR(255) NULL,
  status ENUM('active', 'returned', 'transferred') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_assign_device FOREIGN KEY (device_id) 
    REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_assign_employee FOREIGN KEY (employee_id) 
    REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT fk_assign_dept FOREIGN KEY (department_id) 
    REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_assign_user FOREIGN KEY (assigned_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_assign_device (device_id),
  INDEX idx_assign_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. Maintenance Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL UNIQUE,
  device_id INT NOT NULL,
  issue VARCHAR(255) NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'completed') NOT NULL DEFAULT 'open',
  technician VARCHAR(100) NULL,
  notes TEXT NULL,
  reported_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_date DATETIME NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_maint_device FOREIGN KEY (device_id) 
    REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_maint_user FOREIGN KEY (created_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_maint_ticket (ticket_id),
  INDEX idx_maint_device (device_id),
  INDEX idx_maint_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. Alerts Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NULL,
  alert_type ENUM('offline', 'new_device', 'low_disk', 'low_battery', 'maintenance_req', 'warranty_expiring', 'unassigned') NOT NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('active', 'acknowledged', 'resolved') NOT NULL DEFAULT 'active',
  acknowledged_by INT NULL,
  resolved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  CONSTRAINT fk_alerts_device FOREIGN KEY (device_id) 
    REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_alerts_ack_user FOREIGN KEY (acknowledged_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_alerts_res_user FOREIGN KEY (resolved_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_alerts_device (device_id),
  INDEX idx_alerts_status (status),
  INDEX idx_alerts_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. Notifications Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'critical', 'success') NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12. Audit Logs Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_email VARCHAR(191) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(100) NULL,
  details TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 13. Settings Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description VARCHAR(255) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 14. Installed software inventory (application name, not file contents)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_software (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  version VARCHAR(80) NULL,
  publisher VARCHAR(150) NULL,
  is_running TINYINT(1) NOT NULL DEFAULT 0,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  removed_at DATETIME NULL,
  CONSTRAINT fk_software_device FOREIGN KEY (device_id)
    REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_device_software (device_id, name),
  INDEX idx_software_device (device_id),
  INDEX idx_software_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 15. Application usage sessions (which program, how long)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_app_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  app_name VARCHAR(180) NOT NULL,
  windows_user VARCHAR(80) NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_usage_device FOREIGN KEY (device_id)
    REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_usage_device_time (device_id, started_at),
  INDEX idx_usage_active (device_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 16. Work activity timeline (app switches and session events only)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_activities (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  app_name VARCHAR(180) NULL,
  windows_user VARCHAR(80) NULL,
  summary VARCHAR(255) NOT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_device FOREIGN KEY (device_id)
    REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_activity_device_time (device_id, occurred_at),
  INDEX idx_activity_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
