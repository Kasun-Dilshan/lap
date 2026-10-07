-- =====================================================================
-- Company Laptop Tracking & Management System (CLTMS)
-- Seed Data for MySQL 8.0+
-- =====================================================================

USE db2ly7u58ix9e5;
-- --------------------------------------------------------------------
-- 1. Users (Passwords: Admin@123456, ItAdmin@123456, Manager@123456, Viewer@123456, Owner@123456)
-- ---------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, status, last_login) VALUES
(1, 'Marcus Vance', 'admin@company.com', '$2b$10$oSx76QUua8f0tDHGe1FKFuZEqZE3ew6LQGPv69DqJR3LPb8t1IDTi', 'super_admin', 'active', NOW()),
(2, 'Elena Rostova', 'itadmin@company.com', '$2b$10$boTLL2ND/fJrwkLcq1uy7.5zHe8bIsjvn91HBBlmtlMWzVDwacXDK', 'it_admin', 'active', NOW()),
(3, 'James Thornton', 'manager@company.com', '$2b$10$tMp1JVYnftvZPf6d9p2iYuaadUs5pJ.eiAcpR1SGww5k7hZ27wiYS', 'manager', 'active', NOW()),
(4, 'Chloe Simmons', 'viewer@company.com', '$2b$10$xLIyKObEqhKSvbQ43lhln.qyja51KkYOwBH2a6E3cAGPzseoOmjme', 'viewer', 'active', NOW()),
(5, 'Alex Rivera', 'alex.rivera@company.com', '$2y$10$EboTVaugK6GUAq5DMP29POM3/l56R0Tl6TNQNQJ2K5pBQW34IkLZa', 'laptop_owner', 'active', NULL);

-- ---------------------------------------------------------------------
-- 2. Departments
-- ---------------------------------------------------------------------
INSERT INTO departments (id, name, code, description, budget_allocated) VALUES
(1, 'Information Technology', 'IT', 'Core IT infrastructure, security, and asset operations', 185000.00),
(2, 'Engineering & DevOps', 'ENG', 'Software engineering, platform architecture, and QA', 320000.00),
(3, 'Finance & Accounting', 'FIN', 'Financial reporting, audits, payroll, and investor relations', 95000.00),
(4, 'Human Resources', 'HR', 'Talent acquisition, employee welfare, and onboarding', 60000.00),
(5, 'Sales & Partnerships', 'SALES', 'Global business development and client enterprise sales', 140000.00),
(6, 'Marketing & Growth', 'MKTG', 'Brand awareness, digital campaigns, and product marketing', 85000.00),
(7, 'Operations & Logistics', 'OPS', 'Supply chain, vendor management, and business logistics', 110000.00),
(8, 'Legal & Compliance', 'LEGAL', 'Corporate governance, contracts, and regulatory compliance', 50000.00);

-- ---------------------------------------------------------------------
-- 3. Employees
-- ---------------------------------------------------------------------
INSERT INTO employees (id, employee_id, name, email, phone, department_id, branch, position, status) VALUES
(1, 'EMP-1001', 'Alex Rivera', 'alex.rivera@company.com', '+1 (555) 234-5678', 2, 'Headquarters (NY)', 'Lead Cloud Architect', 'active'),
(2, 'EMP-1002', 'Sarah Jenkins', 'sarah.jenkins@company.com', '+1 (555) 345-6789', 1, 'Headquarters (NY)', 'Senior IT Systems Engineer', 'active'),
(3, 'EMP-1003', 'David Miller', 'david.miller@company.com', '+1 (555) 456-7890', 3, 'Chicago Hub', 'Senior Financial Analyst', 'active'),
(4, 'EMP-1004', 'Emily Zhang', 'emily.zhang@company.com', '+1 (555) 567-8901', 2, 'San Francisco Office', 'Staff Backend Engineer', 'active'),
(5, 'EMP-1005', 'Marcus Sterling', 'marcus.s@company.com', '+1 (555) 678-9012', 5, 'Headquarters (NY)', 'VP of Global Enterprise Sales', 'active'),
(6, 'EMP-1006', 'Hannah Abbott', 'hannah.a@company.com', '+1 (555) 789-0123', 4, 'Headquarters (NY)', 'People Operations Specialist', 'active'),
(7, 'EMP-1007', 'Liam O''Connor', 'liam.oc@company.com', '+44 20 7946 0912', 6, 'London Office', 'Senior Creative Director', 'active'),
(8, 'EMP-1008', 'Sophia Patel', 'sophia.p@company.com', '+1 (555) 890-1234', 2, 'Austin Innovation Hub', 'Frontend Team Lead', 'active'),
(9, 'EMP-1009', 'Nathan Drake', 'nathan.d@company.com', '+1 (555) 901-2345', 7, 'Chicago Hub', 'Logistics Director', 'active'),
(10, 'EMP-1010', 'Jessica Pearson', 'jessica.p@company.com', '+1 (555) 912-3456', 8, 'Headquarters (NY)', 'Chief Legal Counsel', 'active'),
(11, 'EMP-1011', 'Carlos Mendez', 'carlos.m@company.com', '+1 (555) 923-4567', 1, 'San Francisco Office', 'IT Support Specialist', 'active'),
(12, 'EMP-1012', 'Aisha Khan', 'aisha.k@company.com', '+65 6789 0123', 5, 'Singapore Office', 'Regional Sales Director (APAC)', 'active');

-- ---------------------------------------------------------------------
-- 4. Enrollment Tokens
-- ---------------------------------------------------------------------
INSERT INTO enrollment_tokens (id, token, name, max_uses, uses_count, expires_at, created_by, status) VALUES
(1, 'ENROLL-CORP-2026-HQ01', 'HQ Global Bulk Enrollment', 50, 8, DATE_ADD(NOW(), INTERVAL 30 DAY), 1, 'active'),
(2, 'ENROLL-VIP-EXEC-9921', 'Executive Tier Quick Setup', 5, 2, DATE_ADD(NOW(), INTERVAL 14 DAY), 2, 'active'),
(3, 'ENROLL-LEGACY-BATCH-00', 'Old Q1 Rolling Enrollment', 10, 10, DATE_SUB(NOW(), INTERVAL 5 DAY), 1, 'expired');

-- ---------------------------------------------------------------------
-- 5. Devices (Mix of Online, Offline, Maintenance, Windows, macOS)
-- ---------------------------------------------------------------------
INSERT INTO devices (
  id, device_id, asset_id, name, hostname, manufacturer, model, serial_number,
  os, os_version, architecture, cpu_model, ram_total_gb, storage_total_gb,
  employee_id, department_id, branch, assigned_date, status, asset_status,
  purchase_date, warranty_expiry, purchase_price, supplier,
  public_ip, local_ip, mac_address, battery_percent, battery_status,
  cpu_usage, ram_usage, disk_usage, device_token, enrollment_token_id,
  first_seen, last_seen
) VALUES
-- 1. Online Windows - Alex Rivera
(1, 'DEV-WIN-A19F8321', 'SG-LAP-001', 'Alex''s ThinkPad X1', 'WKSTN-NY-01', 'Lenovo', 'ThinkPad X1 Carbon Gen 11', 'LNV-X1C-982144',
 'Windows', 'Windows 11 Pro 23H2', 'x64', '13th Gen Intel Core i7-1365U (10 Cores, 12 Threads)', 32.00, 1024.00,
 1, 2, 'Headquarters (NY)', '2025-01-15 09:30:00', 'online', 'assigned',
 '2025-01-10', '2028-01-10', 1850.00, 'Lenovo Enterprise Direct',
 '198.51.100.42', '192.168.1.105', '00:1A:2B:3C:4D:5E', 89, 'Charging',
 14.50, 48.20, 52.40, 'dev_tok_8f91a27b819234ea7bc10984', 1,
 '2025-01-15 10:00:00', DATE_SUB(NOW(), INTERVAL 20 SECOND)),

-- 2. Online macOS - Sarah Jenkins
(2, 'DEV-MAC-B82910CC', 'SG-LAP-002', 'Sarah''s MacBook Pro 16', 'MBP-NY-SJ02', 'Apple', 'MacBook Pro 16" (M3 Max)', 'C02G9012MD6R',
 'macOS', 'macOS Sonoma 14.4.1', 'arm64', 'Apple M3 Max (16-core CPU, 40-core GPU)', 64.00, 2048.00,
 2, 1, 'Headquarters (NY)', '2025-02-01 10:00:00', 'online', 'assigned',
 '2025-01-25', '2028-01-25', 3899.00, 'Apple Enterprise Store',
 '198.51.100.42', '192.168.1.112', 'F4:D4:88:5A:9C:12', 96, 'Plugged In',
 8.20, 36.80, 41.50, 'dev_tok_9b18ca09e81726a45bd88102', 1,
 '2025-02-01 11:30:00', DATE_SUB(NOW(), INTERVAL 15 SECOND)),

-- 3. Online Windows - David Miller
(3, 'DEV-WIN-C73928FA', 'SG-LAP-003', 'David''s Dell XPS 15', 'WKSTN-CHI-DM03', 'Dell', 'XPS 15 9530', 'DELL-XPS-482910',
 'Windows', 'Windows 11 Enterprise', 'x64', '13th Gen Intel Core i9-13900H (14 Cores)', 32.00, 1024.00,
 3, 3, 'Chicago Hub', '2025-01-20 14:00:00', 'online', 'assigned',
 '2025-01-15', '2027-01-15', 2150.00, 'Dell Technologies Direct',
 '203.0.113.88', '10.0.4.55', '3C:52:82:7E:11:09', 74, 'Discharging',
 22.10, 61.40, 68.20, 'dev_tok_4f0918ac89e17b3c4568910a', 1,
 '2025-01-20 15:00:00', DATE_SUB(NOW(), INTERVAL 45 SECOND)),

-- 4. Online macOS - Emily Zhang
(4, 'DEV-MAC-D629188E', 'SG-LAP-004', 'Emily''s MacBook Air 15', 'MBA-SF-EZ04', 'Apple', 'MacBook Air 15" (M2)', 'C02H1829KD9S',
 'macOS', 'macOS Ventura 13.6.3', 'arm64', 'Apple M2 (8-core CPU, 10-core GPU)', 24.00, 512.00,
 4, 2, 'San Francisco Office', '2025-02-10 11:00:00', 'online', 'assigned',
 '2025-02-05', '2027-02-05', 1699.00, 'Apple Enterprise Store',
 '192.0.2.71', '172.16.2.88', 'A4:83:E7:22:90:31', 62, 'Discharging',
 18.00, 54.00, 71.90, 'dev_tok_1a2b3c4d5e6f7a8b9c0d1e2f', 1,
 '2025-02-10 12:00:00', DATE_SUB(NOW(), INTERVAL 30 SECOND)),

-- 5. Online Windows - Marcus Sterling
(5, 'DEV-WIN-E910283A', 'SG-LAP-005', 'Marcus''s HP EliteBook 840', 'WKSTN-NY-MS05', 'HP', 'EliteBook 840 G10', 'HP-EB840-771920',
 'Windows', 'Windows 11 Pro 23H2', 'x64', 'Intel Core i7-1370P vPro (14 Cores)', 32.00, 1024.00,
 5, 5, 'Headquarters (NY)', '2025-01-18 09:00:00', 'online', 'assigned',
 '2025-01-12', '2028-01-12', 1780.00, 'CDW Corporate IT',
 '198.51.100.42', '192.168.1.144', 'E8:6A:64:1B:77:99', 85, 'Plugged In',
 11.40, 42.10, 49.30, 'dev_tok_7b8c9d0e1f2a3b4c5d6e7f8a', 2,
 '2025-01-18 10:00:00', DATE_SUB(NOW(), INTERVAL 10 SECOND)),

-- 6. Offline Windows - Hannah Abbott (Last seen 3 hours ago)
(6, 'DEV-WIN-F82910AB', 'SG-LAP-006', 'Hannah''s ThinkPad T14s', 'WKSTN-NY-HA06', 'Lenovo', 'ThinkPad T14s Gen 4', 'LNV-T14-662910',
 'Windows', 'Windows 11 Pro 22H2', 'x64', 'AMD Ryzen 7 PRO 7840U (8 Cores, 16 Threads)', 16.00, 512.00,
 6, 4, 'Headquarters (NY)', '2025-02-15 13:00:00', 'offline', 'assigned',
 '2025-02-10', '2027-02-10', 1420.00, 'Lenovo Enterprise Direct',
 '198.51.100.42', '192.168.1.189', '28:D2:44:81:66:34', 45, 'Discharging',
 0.00, 0.00, 58.10, 'dev_tok_3c4d5e6f7a8b9c0d1e2f3a4b', 1,
 '2025-02-15 14:00:00', DATE_SUB(NOW(), INTERVAL 3 HOUR)),

-- 7. Online macOS - Liam O'Connor (London Office)
(7, 'DEV-MAC-A71928CC', 'SG-LAP-007', 'Liam''s MacBook Pro 14', 'MBP-LDN-LO07', 'Apple', 'MacBook Pro 14" (M2 Pro)', 'C02J8819TD8K',
 'macOS', 'macOS Sonoma 14.2', 'arm64', 'Apple M2 Pro (10-core CPU, 16-core GPU)', 32.00, 1024.00,
 7, 6, 'London Office', '2025-01-28 10:00:00', 'online', 'assigned',
 '2025-01-20', '2027-01-20', 2499.00, 'Apple Enterprise UK',
 '81.2.69.142', '192.168.20.45', '70:EF:00:19:AA:88', 92, 'Plugged In',
 15.30, 59.80, 64.10, 'dev_tok_6e7f8a9b0c1d2e3f4a5b6c7d', 1,
 '2025-01-28 11:00:00', DATE_SUB(NOW(), INTERVAL 50 SECOND)),

-- 8. Online Windows - Sophia Patel (High Disk Alert!)
(8, 'DEV-WIN-B99210DD', 'SG-LAP-008', 'Sophia''s Dell Latitude 5440', 'WKSTN-ATX-SP08', 'Dell', 'Latitude 5440', 'DELL-LAT-992183',
 'Windows', 'Windows 11 Pro 23H2', 'x64', '13th Gen Intel Core i7-1355U', 16.00, 512.00,
 8, 2, 'Austin Innovation Hub', '2025-02-20 09:30:00', 'online', 'assigned',
 '2025-02-15', '2027-02-15', 1350.00, 'Dell Technologies Direct',
 '66.249.64.10', '10.20.1.77', '18:66:DA:5F:44:EE', 82, 'Charging',
 29.40, 72.10, 93.40, 'dev_tok_9a8b7c6d5e4f3a2b1c0d9e8f', 1,
 '2025-02-20 10:00:00', DATE_SUB(NOW(), INTERVAL 25 SECOND)),

-- 9. Offline Windows - Nathan Drake (Last seen 2 days ago)
(9, 'DEV-WIN-C11928EE', 'SG-LAP-009', 'Nathan''s HP ZBook Power G10', 'WKSTN-CHI-ND09', 'HP', 'ZBook Power 15.6 G10', 'HP-ZB-119284',
 'Windows', 'Windows 11 Enterprise', 'x64', 'Intel Core i9-13900HK (14 Cores)', 64.00, 2048.00,
 9, 7, 'Chicago Hub', '2025-01-10 15:00:00', 'offline', 'assigned',
 '2025-01-05', '2028-01-05', 2850.00, 'CDW Corporate IT',
 '203.0.113.88', '10.0.4.92', 'D4:5D:64:99:A1:22', 12, 'Discharging',
 0.00, 0.00, 78.50, 'dev_tok_2b3c4d5e6f7a8b9c0d1e2f3a', 1,
 '2025-01-10 16:00:00', DATE_SUB(NOW(), INTERVAL 2 DAY)),

-- 10. Online macOS - Jessica Pearson
(10, 'DEV-MAC-E33819FF', 'SG-LAP-010', 'Jessica''s MacBook Air 13', 'MBA-NY-JP10', 'Apple', 'MacBook Air 13" (M3)', 'C02K9921LD7Q',
 'macOS', 'macOS Sonoma 14.4', 'arm64', 'Apple M3 (8-core CPU, 10-core GPU)', 16.00, 512.00,
 10, 8, 'Headquarters (NY)', '2025-03-01 10:00:00', 'online', 'assigned',
 '2025-02-25', '2027-02-25', 1299.00, 'Apple Enterprise Store',
 '198.51.100.42', '192.168.1.160', '88:66:5A:11:BB:00', 100, 'Plugged In',
 5.10, 31.20, 38.00, 'dev_tok_8a9b0c1d2e3f4a5b6c7d8e9f', 2,
 '2025-03-01 11:00:00', DATE_SUB(NOW(), INTERVAL 35 SECOND)),

-- 11. Maintenance Windows - Carlos Mendez (Hardware Diagnostic)
(11, 'DEV-WIN-G5521011', 'SG-LAP-011', 'Lab ThinkPad P16s Gen 2', 'WKSTN-SF-CM11', 'Lenovo', 'ThinkPad P16s Gen 2', 'LNV-P16S-552109',
 'Windows', 'Windows 11 Pro 23H2', 'x64', 'Intel Core i7-1370P (14 Cores)', 32.00, 1024.00,
 11, 1, 'San Francisco Office', '2025-02-18 14:00:00', 'maintenance', 'maintenance',
 '2025-02-12', '2027-02-12', 2050.00, 'Lenovo Enterprise Direct',
 '192.0.2.71', '172.16.2.105', 'AC:BC:32:88:E1:44', 100, 'Plugged In',
 0.00, 0.00, 44.10, 'dev_tok_1d2e3f4a5b6c7d8e9f0a1b2c', 1,
 '2025-02-18 15:00:00', DATE_SUB(NOW(), INTERVAL 5 HOUR)),

-- 12. Online macOS - Aisha Khan (Singapore Office)
(12, 'DEV-MAC-H7719222', 'SG-LAP-012', 'Aisha''s MacBook Pro 14', 'MBP-SGP-AK12', 'Apple', 'MacBook Pro 14" (M3 Pro)', 'C02L7712MD8P',
 'macOS', 'macOS Sonoma 14.4.1', 'arm64', 'Apple M3 Pro (11-core CPU, 14-core GPU)', 36.00, 1024.00,
 12, 5, 'Singapore Office', '2025-02-05 09:00:00', 'online', 'assigned',
 '2025-01-30', '2027-01-30', 2399.00, 'Apple Enterprise Singapore',
 '175.45.176.10', '192.168.10.15', 'F0:18:98:4C:19:88', 68, 'Discharging',
 12.80, 45.30, 49.00, 'dev_tok_4a5b6c7d8e9f0a1b2c3d4e5f', 1,
 '2025-02-05 10:00:00', DATE_SUB(NOW(), INTERVAL 12 SECOND)),

-- 13. Available Unassigned Windows (Stock pool)
(13, 'DEV-WIN-J8819233', 'SG-LAP-013', 'Spare ThinkPad L14 Gen 4', 'WKSTN-HQ-POOL-01', 'Lenovo', 'ThinkPad L14 Gen 4', 'LNV-L14-881923',
 'Windows', 'Windows 11 Pro 23H2', 'x64', 'AMD Ryzen 5 PRO 7530U', 16.00, 512.00,
 NULL, 1, 'Headquarters (NY)', NULL, 'offline', 'available',
 '2025-03-10', '2027-03-10', 980.00, 'Lenovo Enterprise Direct',
 '198.51.100.42', '192.168.1.200', 'B8:27:EB:99:55:12', 100, 'Plugged In',
 0.00, 0.00, 18.00, 'dev_tok_5b6c7d8e9f0a1b2c3d4e5f6a', 1,
 '2025-03-10 11:00:00', DATE_SUB(NOW(), INTERVAL 4 DAY)),

-- 14. Available Unassigned macOS (Stock pool)
(14, 'DEV-MAC-K9928344', 'SG-LAP-014', 'Spare MacBook Pro 14 M3', 'MBP-HQ-POOL-02', 'Apple', 'MacBook Pro 14" (M3)', 'C02M4419SD9Y',
 'macOS', 'macOS Sonoma 14.4', 'arm64', 'Apple M3 (8-core CPU)', 16.00, 512.00,
 NULL, 1, 'Headquarters (NY)', NULL, 'offline', 'available',
 '2025-03-15', '2027-03-15', 1599.00, 'Apple Enterprise Store',
 '198.51.100.42', '192.168.1.201', '34:E6:D7:12:33:FF', 100, 'Plugged In',
 0.00, 0.00, 15.20, 'dev_tok_7c8d9e0f1a2b3c4d5e6f7a8b', 1,
 '2025-03-15 14:00:00', DATE_SUB(NOW(), INTERVAL 3 DAY)),

-- 15. Maintenance Windows - Warranty Expiring Soon
(15, 'DEV-WIN-L1102955', 'SG-LAP-015', 'Field Dell Precision 3581', 'WKSTN-CHI-FLD15', 'Dell', 'Precision 3581 Workstation', 'DELL-PRC-110295',
 'Windows', 'Windows 11 Enterprise', 'x64', '13th Gen Intel Core i7-13800H', 32.00, 1024.00,
 3, 3, 'Chicago Hub', '2024-04-01 10:00:00', 'maintenance', 'maintenance',
 '2024-03-25', DATE_ADD(NOW(), INTERVAL 15 DAY), 2200.00, 'Dell Technologies Direct',
 '203.0.113.88', '10.0.4.110', '80:7D:3A:45:11:89', 58, 'Charging',
 0.00, 0.00, 62.00, 'dev_tok_9d0e1f2a3b4c5d6e7f8a9b0c', 1,
 '2024-04-01 11:00:00', DATE_SUB(NOW(), INTERVAL 6 HOUR));

-- ---------------------------------------------------------------------
-- 6. Device Heartbeats History
-- ---------------------------------------------------------------------
INSERT INTO device_heartbeats (device_id, cpu_usage, ram_usage, disk_usage, battery_percent, battery_status, public_ip, local_ip, status, recorded_at) VALUES
(1, 12.2, 47.5, 52.4, 91, 'Charging', '198.51.100.42', '192.168.1.105', 'online', DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
(1, 16.8, 48.0, 52.4, 90, 'Charging', '198.51.100.42', '192.168.1.105', 'online', DATE_SUB(NOW(), INTERVAL 3 MINUTE)),
(1, 14.5, 48.2, 52.4, 89, 'Charging', '198.51.100.42', '192.168.1.105', 'online', DATE_SUB(NOW(), INTERVAL 20 SECOND)),

(2, 7.5, 35.9, 41.5, 98, 'Plugged In', '198.51.100.42', '192.168.1.112', 'online', DATE_SUB(NOW(), INTERVAL 4 MINUTE)),
(2, 8.2, 36.8, 41.5, 96, 'Plugged In', '198.51.100.42', '192.168.1.112', 'online', DATE_SUB(NOW(), INTERVAL 15 SECOND)),

(3, 24.5, 62.0, 68.2, 77, 'Discharging', '203.0.113.88', '10.0.4.55', 'online', DATE_SUB(NOW(), INTERVAL 3 MINUTE)),
(3, 22.1, 61.4, 68.2, 74, 'Discharging', '203.0.113.88', '10.0.4.55', 'online', DATE_SUB(NOW(), INTERVAL 45 SECOND)),

(4, 15.0, 52.5, 71.9, 64, 'Discharging', '192.0.2.71', '172.16.2.88', 'online', DATE_SUB(NOW(), INTERVAL 2 MINUTE)),
(4, 18.0, 54.0, 71.9, 62, 'Discharging', '192.0.2.71', '172.16.2.88', 'online', DATE_SUB(NOW(), INTERVAL 30 SECOND)),

(5, 10.2, 41.5, 49.3, 85, 'Plugged In', '198.51.100.42', '192.168.1.144', 'online', DATE_SUB(NOW(), INTERVAL 1 MINUTE)),
(5, 11.4, 42.1, 49.3, 85, 'Plugged In', '198.51.100.42', '192.168.1.144', 'online', DATE_SUB(NOW(), INTERVAL 10 SECOND)),

(7, 14.1, 58.2, 64.1, 93, 'Plugged In', '81.2.69.142', '192.168.20.45', 'online', DATE_SUB(NOW(), INTERVAL 2 MINUTE)),
(7, 15.3, 59.8, 64.1, 92, 'Plugged In', '81.2.69.142', '192.168.20.45', 'online', DATE_SUB(NOW(), INTERVAL 50 SECOND)),

(8, 28.1, 71.5, 93.4, 83, 'Charging', '66.249.64.10', '10.20.1.77', 'online', DATE_SUB(NOW(), INTERVAL 1 MINUTE)),
(8, 29.4, 72.1, 93.4, 82, 'Charging', '66.249.64.10', '10.20.1.77', 'online', DATE_SUB(NOW(), INTERVAL 25 SECOND)),

(12, 11.9, 44.8, 49.0, 70, 'Discharging', '175.45.176.10', '192.168.10.15', 'online', DATE_SUB(NOW(), INTERVAL 3 MINUTE)),
(12, 12.8, 45.3, 49.0, 68, 'Discharging', '175.45.176.10', '192.168.10.15', 'online', DATE_SUB(NOW(), INTERVAL 12 SECOND));

-- ---------------------------------------------------------------------
-- 7. Device Locations (Responsible IP-based Geolocation)
-- ---------------------------------------------------------------------
INSERT INTO device_locations (device_id, public_ip, city, region, country, country_code, latitude, longitude, isp) VALUES
(1, '198.51.100.42', 'New York', 'New York', 'United States', 'US', 40.7128, -74.0060, 'Verizon Enterprise Solutions'),
(2, '198.51.100.42', 'New York', 'New York', 'United States', 'US', 40.7128, -74.0060, 'Verizon Enterprise Solutions'),
(3, '203.0.113.88', 'Chicago', 'Illinois', 'United States', 'US', 41.8781, -87.6298, 'AT&T Commercial'),
(4, '192.0.2.71', 'San Francisco', 'California', 'United States', 'US', 37.7749, -122.4194, 'Comcast Business Communications'),
(5, '198.51.100.42', 'New York', 'New York', 'United States', 'US', 40.7128, -74.0060, 'Verizon Enterprise Solutions'),
(6, '198.51.100.42', 'New York', 'New York', 'United States', 'US', 40.7128, -74.0060, 'Verizon Enterprise Solutions'),
(7, '81.2.69.142', 'London', 'England', 'United Kingdom', 'GB', 51.5074, -0.1278, 'BT Global Services'),
(8, '66.249.64.10', 'Austin', 'Texas', 'United States', 'US', 30.2672, -97.7431, 'Spectrum Enterprise'),
(9, '203.0.113.88', 'Chicago', 'Illinois', 'United States', 'US', 41.8781, -87.6298, 'AT&T Commercial'),
(10, '198.51.100.42', 'New York', 'New York', 'United States', 'US', 40.7128, -74.0060, 'Verizon Enterprise Solutions'),
(11, '192.0.2.71', 'San Francisco', 'California', 'United States', 'US', 37.7749, -122.4194, 'Comcast Business Communications'),
(12, '175.45.176.10', 'Singapore', 'Central Singapore', 'Singapore', 'SG', 1.3521, 103.8198, 'Singtel Corporate Networks'),
(13, '198.51.100.42', 'New York', 'New York', 'United States', 'US', 40.7128, -74.0060, 'Verizon Enterprise Solutions'),
(14, '198.51.100.42', 'New York', 'New York', 'United States', 'US', 40.7128, -74.0060, 'Verizon Enterprise Solutions'),
(15, '203.0.113.88', 'Chicago', 'Illinois', 'United States', 'US', 41.8781, -87.6298, 'AT&T Commercial');

-- ---------------------------------------------------------------------
-- 8. Device Assignments History
-- ---------------------------------------------------------------------
INSERT INTO device_assignments (device_id, employee_id, department_id, assigned_date, assigned_by, notes, status) VALUES
(1, 1, 2, '2025-01-15 09:30:00', 1, 'Standard developer setup with WSL2 and Docker', 'active'),
(2, 2, 1, '2025-02-01 10:00:00', 1, 'IT Senior Engineer workstation with MDM admin tools', 'active'),
(3, 3, 3, '2025-01-20 14:00:00', 2, 'Finance department workstation with Bloomberg Terminal client', 'active'),
(4, 4, 2, '2025-02-10 11:00:00', 2, 'Backend engineering remote setup', 'active'),
(5, 5, 5, '2025-01-18 09:00:00', 1, 'Executive sales laptop with international travel bundle', 'active'),
(6, 6, 4, '2025-02-15 13:00:00', 2, 'People ops workstation', 'active'),
(7, 7, 6, '2025-01-28 10:00:00', 1, 'London creative direction laptop with Adobe Creative Cloud', 'active'),
(8, 8, 2, '2025-02-20 09:30:00', 2, 'Frontend lead workstation with dual external monitor docks', 'active'),
(9, 9, 7, '2025-01-10 15:00:00', 1, 'Logistics field unit', 'active'),
(10, 10, 8, '2025-03-01 10:00:00', 1, 'Executive legal counsel device with full BitLocker encryption', 'active'),
(11, 11, 1, '2025-02-18 14:00:00', 2, 'Assigned to lab for hardware assessment', 'active'),
(12, 12, 5, '2025-02-05 09:00:00', 1, 'Regional sales APAC director unit', 'active');

-- ---------------------------------------------------------------------
-- 9. Maintenance Records
-- ---------------------------------------------------------------------
INSERT INTO maintenance (ticket_id, device_id, issue, priority, status, technician, notes, reported_date, completed_date, created_by) VALUES
('MNT-2026-001', 11, 'Display backlight flickering intermittently on battery power', 'high', 'in_progress', 'Sarah Jenkins', 'Replaced display EDP cable; running 24h stress test.', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, 2),
('MNT-2026-002', 15, 'Thermal throttling under light load; fans spinning at max RPM', 'medium', 'open', 'Carlos Mendez', 'Scheduled for heatsink repasting and fan dust clearance.', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, 1),
('MNT-2026-003', 6, 'USB-C Thunderbolt dock charging port connection loose', 'medium', 'completed', 'Sarah Jenkins', 'Cleaned debris from port and updated Thunderbolt firmware. Port functioning normally.', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), 2),
('MNT-2026-004', 8, 'Drive disk space exceeded 90% threshold; potential log leak', 'high', 'open', 'Carlos Mendez', 'Investigating system crash dump accumulation in user directory.', DATE_SUB(NOW(), INTERVAL 4 HOUR), NULL, 2);

-- ---------------------------------------------------------------------
-- 10. Alerts
-- ---------------------------------------------------------------------
INSERT INTO alerts (device_id, alert_type, severity, title, message, status, created_at) VALUES
(8, 'low_disk', 'warning', 'High Disk Usage Detected', 'SG-LAP-008 (Sophia Patel) primary storage has reached 93.4% capacity (under 35 GB remaining).', 'active', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(9, 'offline', 'critical', 'Device Offline Beyond Threshold', 'SG-LAP-009 (Nathan Drake) has been offline for over 48 hours without scheduled maintenance notice.', 'active', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(15, 'warranty_expiring', 'info', 'Warranty Expiring in 15 Days', 'SG-LAP-015 (Field Dell Precision 3581) manufacturer warranty ends soon. Review renewal or replacement.', 'active', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(13, 'unassigned', 'info', 'Unassigned Device Idle in Pool', 'SG-LAP-013 is currently unassigned in Headquarters inventory pool.', 'acknowledged', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(6, 'offline', 'warning', 'Device Recently Offline', 'SG-LAP-006 (Hannah Abbott) has not sent a heartbeat for 3 hours.', 'active', DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- ---------------------------------------------------------------------
-- 11. Notifications
-- ---------------------------------------------------------------------
INSERT INTO notifications (user_id, title, message, type, is_read, link) VALUES
(1, 'Critical Device Offline', 'Device SG-LAP-009 has exceeded 48h offline threshold.', 'critical', FALSE, '/devices/9'),
(1, 'High Disk Usage Alert', 'Device SG-LAP-008 storage usage is critical at 93.4%.', 'warning', FALSE, '/devices/8'),
(2, 'New Maintenance Ticket', 'Ticket MNT-2026-002 assigned for Dell Precision 3581.', 'info', FALSE, '/maintenance'),
(1, 'Agent Enrolled Successfully', 'Device SG-LAP-012 connected from Singapore branch.', 'success', TRUE, '/devices/12');

-- ---------------------------------------------------------------------
-- 12. Settings
-- ---------------------------------------------------------------------
INSERT INTO settings (setting_key, setting_value, description) VALUES
('company_name', 'Apex Global Technologies, Inc.', 'Company legal name displayed in reports and branding'),
('offline_threshold_minutes', '5', 'Minutes without heartbeat before marking device as offline'),
('heartbeat_interval_seconds', '60', 'Default heartbeat interval configured for Laptop Agents'),
('low_disk_threshold_percent', '90', 'Percentage disk usage that triggers an automated alert'),
('low_battery_threshold_percent', '15', 'Percentage battery level that triggers an automated alert'),
('warranty_reminder_days', '30', 'Days before warranty expiration to trigger renewal alert'),
('enrollment_token_expiry_hours', '48', 'Default lifespan in hours for generated enrollment tokens'),
('admin_email', 'it-admin@company.com', 'Primary IT contact email for system notifications');

-- ---------------------------------------------------------------------
-- 13. Audit Logs
-- ---------------------------------------------------------------------
INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, created_at) VALUES
(1, 'admin@company.com', 'SYSTEM_INIT', 'SYSTEM', '0', 'System database initialized with baseline security policies', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(1, 'admin@company.com', 'USER_LOGIN', 'USER', '1', 'Successful administrator authentication', '198.51.100.42', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 'itadmin@company.com', 'DEVICE_ASSIGNED', 'DEVICE', 'SG-LAP-010', 'Assigned SG-LAP-010 to Jessica Pearson (Legal)', '198.51.100.42', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 'itadmin@company.com', 'MAINTENANCE_CREATED', 'MAINTENANCE', 'MNT-2026-001', 'Created high-priority ticket for ThinkPad P16s display issue', '198.51.100.42', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 'admin@company.com', 'ENROLLMENT_TOKEN_CREATED', 'ENROLLMENT', 'ENROLL-CORP-2026-HQ01', 'Created bulk enrollment token valid for 50 devices', '198.51.100.42', DATE_SUB(NOW(), INTERVAL 15 DAY));

-- ---------------------------------------------------------------------
-- 14. Installed software and work activity samples
-- ---------------------------------------------------------------------
INSERT IGNORE INTO device_software (device_id, name, version, publisher, is_running, first_seen, last_seen) VALUES
(1, 'Visual Studio Code', '1.95.0', 'Microsoft', 1, DATE_SUB(NOW(), INTERVAL 40 DAY), NOW()),
(1, 'Google Chrome', '129.0', 'Google', 0, DATE_SUB(NOW(), INTERVAL 40 DAY), NOW()),
(1, 'Microsoft Teams', '24231.0', 'Microsoft', 0, DATE_SUB(NOW(), INTERVAL 40 DAY), NOW()),
(1, 'Slack', '4.40.0', 'Slack Technologies', 0, DATE_SUB(NOW(), INTERVAL 20 DAY), NOW()),
(1, 'Git', '2.46.0', 'Git for Windows', 0, DATE_SUB(NOW(), INTERVAL 40 DAY), NOW()),
(2, 'Slack', '4.40.0', 'Slack Technologies', 1, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()),
(2, 'Google Chrome', '129.0', 'Google', 0, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()),
(2, 'Visual Studio Code', '1.95.0', 'Microsoft', 0, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()),
(2, '1Password', '8.10.0', 'AgileBits', 0, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()),
(3, 'Microsoft Excel', '16.0', 'Microsoft', 1, DATE_SUB(NOW(), INTERVAL 50 DAY), NOW()),
(3, 'Microsoft Outlook', '16.0', 'Microsoft', 0, DATE_SUB(NOW(), INTERVAL 50 DAY), NOW()),
(3, 'Google Chrome', '129.0', 'Google', 0, DATE_SUB(NOW(), INTERVAL 50 DAY), NOW()),
(3, 'Adobe Acrobat', '24.3', 'Adobe', 0, DATE_SUB(NOW(), INTERVAL 50 DAY), NOW()),
(4, 'Visual Studio Code', '1.95.0', 'Microsoft', 1, DATE_SUB(NOW(), INTERVAL 25 DAY), NOW()),
(4, 'Figma', '124.0', 'Figma', 0, DATE_SUB(NOW(), INTERVAL 25 DAY), NOW()),
(4, 'Google Chrome', '129.0', 'Google', 0, DATE_SUB(NOW(), INTERVAL 25 DAY), NOW()),
(4, 'Docker Desktop', '4.34.0', 'Docker', 0, DATE_SUB(NOW(), INTERVAL 25 DAY), NOW()),
(5, 'Microsoft PowerPoint', '16.0', 'Microsoft', 1, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
(5, 'Microsoft Outlook', '16.0', 'Microsoft', 0, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
(5, 'Microsoft Teams', '24231.0', 'Microsoft', 0, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
(5, 'Google Chrome', '129.0', 'Google', 0, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW()),
(6, 'Microsoft Word', '16.0', 'Microsoft', 0, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW()),
(6, 'Microsoft Outlook', '16.0', 'Microsoft', 0, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW()),
(6, 'Google Chrome', '129.0', 'Google', 0, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW());

INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 1, 'Google Chrome', 'alex.rivera', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 100 MINUTE), 8400, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 1 AND app_name = 'Google Chrome');
INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 1, 'Microsoft Teams', 'alex.rivera', DATE_SUB(NOW(), INTERVAL 100 MINUTE), DATE_SUB(NOW(), INTERVAL 50 MINUTE), 3000, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 1 AND app_name = 'Microsoft Teams');
INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 1, 'Visual Studio Code', 'alex.rivera', DATE_SUB(NOW(), INTERVAL 50 MINUTE), NULL, 3000, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 1 AND is_active = 1);

INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 2, 'Google Chrome', 'sarah.jenkins', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 40 MINUTE), 8400, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 2 AND app_name = 'Google Chrome');
INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 2, 'Slack', 'sarah.jenkins', DATE_SUB(NOW(), INTERVAL 40 MINUTE), NULL, 2400, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 2 AND is_active = 1);

INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 3, 'Microsoft Outlook', 'david.miller', DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 10800, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 3 AND app_name = 'Microsoft Outlook');
INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 3, 'Microsoft Excel', 'david.miller', DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, 7200, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 3 AND is_active = 1);

INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 4, 'Figma', 'emily.zhang', DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), 10800, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 4 AND app_name = 'Figma');
INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 4, 'Visual Studio Code', 'emily.zhang', DATE_SUB(NOW(), INTERVAL 90 MINUTE), NULL, 5400, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 4 AND is_active = 1);

INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 5, 'Microsoft Outlook', 'marcus.sterling', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 30 MINUTE), 5400, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 5 AND app_name = 'Microsoft Outlook');
INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 5, 'Microsoft PowerPoint', 'marcus.sterling', DATE_SUB(NOW(), INTERVAL 30 MINUTE), NULL, 1800, 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 5 AND is_active = 1);

INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, ended_at, duration_seconds, is_active)
SELECT 6, 'Microsoft Word', 'hannah.abbott', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 20 HOUR), 3600, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_app_sessions WHERE device_id = 6 AND app_name = 'Microsoft Word');

INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 1, 'session_start', NULL, 'alex.rivera', 'alex.rivera signed in', DATE_SUB(NOW(), INTERVAL 4 HOUR)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 1 AND event_type = 'session_start');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 1, 'app_focus', 'Google Chrome', 'alex.rivera', 'alex.rivera started using Google Chrome', DATE_SUB(NOW(), INTERVAL 4 HOUR)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 1 AND app_name = 'Google Chrome' AND event_type = 'app_focus');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 1, 'app_focus', 'Microsoft Teams', 'alex.rivera', 'alex.rivera started using Microsoft Teams', DATE_SUB(NOW(), INTERVAL 100 MINUTE)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 1 AND app_name = 'Microsoft Teams');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 1, 'app_focus', 'Visual Studio Code', 'alex.rivera', 'alex.rivera started using Visual Studio Code', DATE_SUB(NOW(), INTERVAL 50 MINUTE)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 1 AND app_name = 'Visual Studio Code' AND event_type = 'app_focus');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 2, 'app_focus', 'Slack', 'sarah.jenkins', 'sarah.jenkins started using Slack', DATE_SUB(NOW(), INTERVAL 40 MINUTE)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 2 AND app_name = 'Slack' AND event_type = 'app_focus');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 3, 'app_focus', 'Microsoft Excel', 'david.miller', 'david.miller started using Microsoft Excel', DATE_SUB(NOW(), INTERVAL 2 HOUR)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 3 AND app_name = 'Microsoft Excel' AND event_type = 'app_focus');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 3, 'screen_lock', NULL, 'david.miller', 'david.miller locked the workstation', DATE_SUB(NOW(), INTERVAL 3 HOUR)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 3 AND event_type = 'screen_lock');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 3, 'screen_unlock', NULL, 'david.miller', 'david.miller unlocked the workstation', DATE_SUB(NOW(), INTERVAL 150 MINUTE)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 3 AND event_type = 'screen_unlock');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 4, 'app_focus', 'Visual Studio Code', 'emily.zhang', 'emily.zhang started using Visual Studio Code', DATE_SUB(NOW(), INTERVAL 90 MINUTE)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 4 AND app_name = 'Visual Studio Code' AND event_type = 'app_focus');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 5, 'app_focus', 'Microsoft PowerPoint', 'marcus.sterling', 'marcus.sterling started using Microsoft PowerPoint', DATE_SUB(NOW(), INTERVAL 30 MINUTE)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 5 AND app_name = 'Microsoft PowerPoint');
INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
SELECT 6, 'session_end', NULL, 'hannah.abbott', 'hannah.abbott signed out', DATE_SUB(NOW(), INTERVAL 20 HOUR)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM device_activities WHERE device_id = 6 AND event_type = 'session_end');
