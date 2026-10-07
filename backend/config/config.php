<?php

declare(strict_types=1);

function loadEnv(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        // Support quoted values so passwords can contain # & ] etc.
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"'))
            || (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        if ($key === '') {
            continue;
        }

        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
        putenv("{$key}={$value}");
    }
}

function envValue(string $key, ?string $default = null): ?string
{
    if (array_key_exists($key, $_ENV) && $_ENV[$key] !== null) {
        return (string) $_ENV[$key];
    }

    $value = getenv($key);
    if ($value !== false) {
        return (string) $value;
    }

    return $default;
}

loadEnv(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');

return [
    'env' => envValue('APP_ENV', 'production'),
    'timezone' => envValue('APP_TIMEZONE', 'Asia/Colombo'),
    'db_timezone' => envValue('DB_TIMEZONE', '+05:30'),
    'port' => (int) (envValue('PORT', '5000') ?: 5000),
    'db' => [
        'host' => envValue('DB_HOST', 'localhost'),
        'port' => (int) (envValue('DB_PORT', '3306') ?: 3306),
        'user' => envValue('DB_USER', 'uyertnxws3nrr'),
        'password' => (string) envValue('DB_PASSWORD', ''),
        'name' => envValue('DB_NAME', 'db2ly7u58ix9e5'),
    ],
    'jwt_secret' => envValue('JWT_SECRET', 'company-laptop-mgmt-super-secret-key-2026'),
    'jwt_expires_in' => (int) (envValue('JWT_EXPIRES_IN', '86400') ?: 86400),
    'offline_threshold_minutes' => (int) (envValue('DEFAULT_OFFLINE_THRESHOLD_MINUTES', '5') ?: 5),
    'heartbeat_interval_seconds' => (int) (envValue('DEFAULT_HEARTBEAT_INTERVAL_SECONDS', '60') ?: 60),
    'cors_origin' => envValue('CORS_ORIGIN', '*'),
];
