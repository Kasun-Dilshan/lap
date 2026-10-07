<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Colombo');

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => true,
    'php' => PHP_VERSION,
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'time' => date('c'),
    'timezone' => date_default_timezone_get(),
]);
