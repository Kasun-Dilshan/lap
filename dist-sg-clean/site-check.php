<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$root = __DIR__;
$checks = [
    'index_html' => is_file($root . '/index.html'),
    'index_php' => is_file($root . '/index.php'),
    'htaccess' => is_file($root . '/.htaccess'),
    'assets_app_js' => is_file($root . '/assets/app.js'),
    'assets_css' => (bool) glob($root . '/assets/*.css'),
    'backend_index' => is_file($root . '/backend/public/index.php'),
    'backend_env' => is_file($root . '/backend/.env'),
];

$appJsSize = $checks['assets_app_js'] ? filesize($root . '/assets/app.js') : 0;

echo json_encode([
    'success' => !in_array(false, $checks, true),
    'timezone' => date_default_timezone_get(),
    'php' => PHP_VERSION,
    'document_root' => $root,
    'app_js_bytes' => $appJsSize,
    'checks' => $checks,
    'hint' => !in_array(false, $checks, true)
        ? 'Files look OK. Hard refresh the homepage (Ctrl+F5). If still blank, open DevTools → Console for JS errors.'
        : 'Upload failed or wrong folder. Extract the zip so index.html, index.php, assets/app.js, backend/, and .htaccess are in the same folder.',
], JSON_PRETTY_PRINT);
