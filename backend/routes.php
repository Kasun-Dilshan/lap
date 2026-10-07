<?php

declare(strict_types=1);

/** @var Router $router */

$admin = ['super_admin', 'it_admin'];
$super = ['super_admin'];

// Health
$router->get('/api/health', static function () {
    Response::json([
        'success' => true,
        'status' => 'ONLINE',
        'service' => 'Company Laptop Tracking & Management System API',
        'database_engine' => 'mysql',
        'timestamp' => date('c'),
    ]);
});

// Auth
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/owner-login', [OwnerController::class, 'login']);
$router->post('/api/owner/install-register', [OwnerController::class, 'installRegister']);
$router->get('/api/owner/laptop', [OwnerController::class, 'laptop'], 'user');
$router->post('/api/owner/track', [OwnerController::class, 'track'], 'user');
$router->post('/api/owner/agent-install', [OwnerController::class, 'agentInstall'], 'user');
$router->get('/api/owner/bootstrap.cmd', [OwnerController::class, 'bootstrap'], 'user');
$router->get('/api/agent/agent.js', [OwnerController::class, 'agentScript']);
$router->get('/api/auth/me', [AuthController::class, 'me'], 'user');
$router->post('/api/auth/change-password', [AuthController::class, 'changePassword'], 'user');
$router->post('/api/auth/forgot-password', [AuthController::class, 'forgotPassword']);

// Devices (agent)
$router->post('/api/devices/register', [DeviceController::class, 'register']);
$router->post('/api/devices/heartbeat', [DeviceController::class, 'heartbeat'], 'device');
if (class_exists('ActivityController')) {
    $router->post('/api/devices/activity', [ActivityController::class, 'report'], 'device');
}

// Devices (admin)
$router->get('/api/devices/stats', [DeviceController::class, 'stats'], 'user');
$router->get('/api/devices', [DeviceController::class, 'index'], 'user');
if (class_exists('ActivityController')) {
    $router->get('/api/devices/{id}/work', [ActivityController::class, 'work'], 'user');
}
$router->get('/api/devices/{id}', [DeviceController::class, 'show'], 'user');
if (class_exists('ActivityController')) {
    $router->get('/api/activity/summary', [ActivityController::class, 'summary'], 'user');
    $router->get('/api/activity', [ActivityController::class, 'index'], 'user');
}
$router->post('/api/devices', [DeviceController::class, 'store'], 'user', $admin);
$router->put('/api/devices/{id}', [DeviceController::class, 'update'], 'user', $admin);
$router->delete('/api/devices/{id}', [DeviceController::class, 'destroy'], 'user', $super);
$router->put('/api/devices/{id}/assign', [DeviceController::class, 'assign'], 'user', $admin);
$router->put('/api/devices/{id}/unassign', [DeviceController::class, 'unassign'], 'user', $admin);
$router->put('/api/devices/{id}/maintenance', [DeviceController::class, 'toggleMaintenance'], 'user', $admin);
$router->put('/api/devices/{id}/deactivate', [DeviceController::class, 'deactivate'], 'user', $admin);
$router->put('/api/devices/{id}/remove-agent', [DeviceController::class, 'removeAgent'], 'user', $admin);
$router->put('/api/devices/{id}/allow-agent', [DeviceController::class, 'allowAgent'], 'user', $admin);

// Employees
$router->get('/api/employees', [EmployeeController::class, 'index'], 'user');
$router->get('/api/employees/{id}', [EmployeeController::class, 'show'], 'user');
$router->post('/api/employees', [EmployeeController::class, 'store'], 'user', $admin);
$router->put('/api/employees/{id}', [EmployeeController::class, 'update'], 'user', $admin);
$router->put('/api/employees/{id}/deactivate', [EmployeeController::class, 'deactivate'], 'user', $admin);
$router->delete('/api/employees/{id}', [EmployeeController::class, 'destroy'], 'user', $super);

// Departments
$router->get('/api/departments', [DepartmentController::class, 'index'], 'user');
$router->post('/api/departments', [DepartmentController::class, 'store'], 'user', $admin);
$router->put('/api/departments/{id}', [DepartmentController::class, 'update'], 'user', $admin);
$router->delete('/api/departments/{id}', [DepartmentController::class, 'destroy'], 'user', $super);

// Maintenance
$router->get('/api/maintenance', [MaintenanceController::class, 'index'], 'user');
$router->get('/api/maintenance/{id}', [MaintenanceController::class, 'show'], 'user');
$router->post('/api/maintenance', [MaintenanceController::class, 'store'], 'user', $admin);
$router->put('/api/maintenance/{id}', [MaintenanceController::class, 'update'], 'user', $admin);
$router->delete('/api/maintenance/{id}', [MaintenanceController::class, 'destroy'], 'user', $super);

// Alerts
$router->get('/api/alerts', [AlertController::class, 'index'], 'user');
$router->put('/api/alerts/{id}/acknowledge', [AlertController::class, 'acknowledge'], 'user', $admin);
$router->put('/api/alerts/{id}/resolve', [AlertController::class, 'resolve'], 'user', $admin);
$router->post('/api/alerts/check', [AlertController::class, 'check'], 'user', $admin);

// Notifications
$router->get('/api/notifications', [NotificationController::class, 'index'], 'user');
$router->put('/api/notifications/read-all', [NotificationController::class, 'markAllRead'], 'user');
$router->put('/api/notifications/{id}/read', [NotificationController::class, 'markRead'], 'user');

// Enrollment tokens
$router->get('/api/enrollment-tokens', [EnrollmentController::class, 'index'], 'user');
$router->post('/api/enrollment-tokens', [EnrollmentController::class, 'store'], 'user', $admin);
$router->put('/api/enrollment-tokens/{id}/revoke', [EnrollmentController::class, 'revoke'], 'user', $admin);
$router->delete('/api/enrollment-tokens/{id}', [EnrollmentController::class, 'destroy'], 'user', $super);

// Reports
$router->get('/api/reports/devices', [ReportController::class, 'devices'], 'user');
$router->get('/api/reports/employees', [ReportController::class, 'employees'], 'user');
$router->get('/api/reports/departments', [ReportController::class, 'departments'], 'user');
$router->get('/api/reports/maintenance', [ReportController::class, 'maintenance'], 'user');

// Audit / Settings / Users
$router->get('/api/audit-logs', [AuditController::class, 'index'], 'user', $admin);
$router->get('/api/settings', [SettingController::class, 'index'], 'user');
$router->put('/api/settings', [SettingController::class, 'update'], 'user', $admin);
$router->get('/api/users', [UserController::class, 'index'], 'user', $super);
$router->post('/api/users', [UserController::class, 'store'], 'user', $super);
$router->put('/api/users/{id}', [UserController::class, 'update'], 'user', $super);
$router->delete('/api/users/{id}', [UserController::class, 'destroy'], 'user', $super);
