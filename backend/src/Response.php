<?php

declare(strict_types=1);

class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
        if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
            $flags |= JSON_INVALID_UTF8_SUBSTITUTE;
        }
        $encoded = json_encode($data, $flags);
        echo $encoded === false ? '{"success":false,"message":"Failed to encode response."}' : $encoded;
        exit;
    }

    public static function text(string $body, int $status = 200, array $headers = []): void
    {
        http_response_code($status);
        foreach ($headers as $name => $value) {
            header("{$name}: {$value}");
        }
        echo $body;
        exit;
    }

    public static function error(string $message, int $status = 400): void
    {
        self::json(['success' => false, 'message' => $message], $status);
    }

    public static function success(mixed $data = null, string $message = '', int $status = 200, array $extra = []): void
    {
        $payload = array_merge(['success' => true], $extra);
        if ($message !== '') {
            $payload['message'] = $message;
        }
        if ($data !== null) {
            $payload['data'] = $data;
        }
        self::json($payload, $status);
    }
}
