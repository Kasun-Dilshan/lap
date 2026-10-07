<?php

declare(strict_types=1);

class Auth
{
    public static function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if ($header === '' && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $key => $value) {
                if (strcasecmp($key, 'Authorization') === 0) {
                    $header = $value;
                    break;
                }
            }
        }

        if (preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    public static function requireUser(array $config): array
    {
        $token = self::bearerToken();
        if (!$token) {
            Response::error('Access denied. No authentication token provided.', 401);
        }

        try {
            $payload = Jwt::decode($token, $config['jwt_secret']);
        } catch (Throwable $e) {
            Response::error('Invalid or expired authentication token.', 403);
        }

        return [
            'id' => (int) ($payload['id'] ?? 0),
            'name' => (string) ($payload['name'] ?? ''),
            'email' => (string) ($payload['email'] ?? ''),
            'role' => (string) ($payload['role'] ?? ''),
        ];
    }

    public static function requireRole(array $user, array $allowedRoles): void
    {
        if (!in_array($user['role'], $allowedRoles, true)) {
            Response::error(
                "Forbidden. Role '{$user['role']}' lacks permission for this action.",
                403
            );
        }
    }

    public static function requireDevice(): array
    {
        $token = self::bearerToken();
        if (!$token) {
            Response::error('Device authorization required. Missing device token.', 401);
        }

        $device = Database::get('SELECT * FROM devices WHERE device_token = ?', [$token]);
        if (!$device) {
            Response::error('Invalid device authentication token.', 401);
        }

        if (array_key_exists('agent_allowed', $device) && (int) $device['agent_allowed'] !== 1) {
            Response::error('Tracking agent was removed by IT. This laptop is no longer enrolled.', 403);
        }

        return $device;
    }

    public static function clientIp(): string
    {
        return $_SERVER['HTTP_X_FORWARDED_FOR']
            ?? $_SERVER['REMOTE_ADDR']
            ?? '127.0.0.1';
    }
}
