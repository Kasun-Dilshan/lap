<?php

declare(strict_types=1);

/**
 * SiteGround-friendly SPA entry.
 * Serves index.html with the correct Content-Type so the React app can boot.
 */
$htmlPath = __DIR__ . DIRECTORY_SEPARATOR . 'index.html';

if (!is_file($htmlPath)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Missing index.html. Upload the SiteGround package contents into this folder.";
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
readfile($htmlPath);
