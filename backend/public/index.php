<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

$config = require dirname(__DIR__) . '/src/bootstrap.php';

$origin = $config['cors_origin'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();
require dirname(__DIR__) . '/routes.php';

try {
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $router->dispatch($method, $uri, $config);
} catch (Throwable $e) {
    error_log('[Unhandled Server Error]: ' . $e->getMessage());
    Response::error(
        $config['env'] === 'development' ? $e->getMessage() : 'Internal server error occurred.',
        500
    );
}
