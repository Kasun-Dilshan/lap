<?php

declare(strict_types=1);

// PHP built-in server router: php -S localhost:5000 router.php

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$publicFile = __DIR__ . '/public' . $uri;

if ($uri !== '/' && is_file($publicFile)) {
    return false;
}

require __DIR__ . '/public/index.php';
