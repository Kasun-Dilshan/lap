<?php

declare(strict_types=1);

class Request
{
    private static ?array $json = null;

    public static function body(): array
    {
        if (self::$json !== null) {
            return self::$json;
        }

        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            self::$json = $_POST ?: [];
            return self::$json;
        }

        $decoded = json_decode($raw, true);
        self::$json = is_array($decoded) ? $decoded : [];
        return self::$json;
    }

    public static function query(string $key = '', mixed $default = null): mixed
    {
        if ($key === '') {
            return $_GET;
        }
        return $_GET[$key] ?? $default;
    }
}
