<?php

declare(strict_types=1);

$config = require dirname(__DIR__) . '/config/config.php';

date_default_timezone_set($config['timezone'] ?? 'Asia/Colombo');

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/Jwt.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Audit.php';
require_once __DIR__ . '/Request.php';
require_once __DIR__ . '/Router.php';

$controllerFiles = glob(dirname(__DIR__) . '/controllers/*.php');
if (is_array($controllerFiles)) {
    foreach ($controllerFiles as $file) {
        $code = @file_get_contents($file);
        if ($code === false) {
            continue;
        }
        try {
            token_get_all($code, TOKEN_PARSE);
            require_once $file;
        } catch (Throwable $e) {
            error_log('Skipping controller ' . basename($file) . ': ' . $e->getMessage());
        }
    }
}

require_once dirname(__DIR__) . '/services/HeartbeatMonitor.php';

try {
    Database::connect($config['db']);
    try {
        $dbTimezone = $config['db_timezone'] ?? '+05:30';
        Database::pdo()->exec('SET time_zone = ' . Database::pdo()->quote($dbTimezone));
    } catch (Throwable $e) {
        error_log('MySQL time_zone skipped: ' . $e->getMessage());
    }
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage(),
    ]);
    exit;
}

try {
    $roleColumn = Database::get("SHOW COLUMNS FROM users LIKE 'role'");
    $roleType = (string) ($roleColumn['Type'] ?? $roleColumn['type'] ?? '');
    if ($roleType !== '' && !str_contains($roleType, 'laptop_owner')) {
        Database::pdo()->exec(
            "ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','it_admin','manager','viewer','laptop_owner') NOT NULL DEFAULT 'viewer'"
        );
    }
} catch (Throwable $e) {
    error_log('laptop_owner role migration skipped: ' . $e->getMessage());
}

try {
    $installedCol = Database::get("SHOW COLUMNS FROM devices LIKE 'agent_installed_at'");
    if (!$installedCol) {
        Database::pdo()->exec(
            'ALTER TABLE devices
             ADD COLUMN agent_installed_at DATETIME NULL AFTER device_token,
             ADD COLUMN agent_allowed TINYINT(1) NOT NULL DEFAULT 1 AFTER agent_installed_at'
        );
    }
} catch (Throwable $e) {
    error_log('agent tracking columns migration skipped: ' . $e->getMessage());
}

return $config;
