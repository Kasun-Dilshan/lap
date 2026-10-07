<?php

declare(strict_types=1);

class AuthController
{
    public static function login(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        if ($email === '' || $password === '') {
            Response::error('Email and password are required.');
        }

        $record = Database::get('SELECT * FROM users WHERE email = ?', [$email]);
        if (!$record) {
            Response::error('Invalid credentials. User does not exist.', 401);
        }

        if (($record['status'] ?? '') !== 'active') {
            Response::error("Account is {$record['status']}. Please contact system administrator.", 403);
        }

        $hash = (string) $record['password_hash'];
        // Normalize bcrypt $2b$ hashes for PHP password_verify
        $verifyHash = str_starts_with($hash, '$2b$') ? ('$2y$' . substr($hash, 4)) : $hash;

        if (!password_verify($password, $verifyHash)) {
            Response::error('Invalid email or password.', 401);
        }

        Database::run('UPDATE users SET last_login = NOW() WHERE id = ?', [(int) $record['id']]);

        $payload = [
            'id' => (int) $record['id'],
            'name' => $record['name'],
            'email' => $record['email'],
            'role' => $record['role'],
        ];

        $token = Jwt::encode($payload, $config['jwt_secret'], $config['jwt_expires_in']);

        Audit::log($payload, 'USER_LOGIN', 'USER', $record['id'], [
            'email' => $record['email'],
            'role' => $record['role'],
        ]);

        Response::success([
            'token' => $token,
            'user' => [
                'id' => (int) $record['id'],
                'name' => $record['name'],
                'email' => $record['email'],
                'role' => $record['role'],
                'last_login' => $record['last_login'],
            ],
        ], 'Login successful.');
    }

    public static function me(array $params, ?array $user, ?array $device, array $config): void
    {
        $record = Database::get(
            'SELECT id, name, email, role, status, last_login, created_at FROM users WHERE id = ?',
            [$user['id']]
        );

        if (!$record) {
            Response::error('User profile not found.', 404);
        }

        Response::success($record);
    }

    public static function changePassword(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $current = (string) ($body['current_password'] ?? '');
        $new = (string) ($body['new_password'] ?? '');

        if ($current === '' || $new === '') {
            Response::error('Current password and new password are required.');
        }

        if (strlen($new) < 6) {
            Response::error('New password must be at least 6 characters long.');
        }

        $record = Database::get('SELECT * FROM users WHERE id = ?', [$user['id']]);
        $hash = (string) $record['password_hash'];
        $verifyHash = str_starts_with($hash, '$2b$') ? ('$2y$' . substr($hash, 4)) : $hash;

        if (!password_verify($current, $verifyHash)) {
            Response::error('Incorrect current password.');
        }

        $newHash = password_hash($new, PASSWORD_BCRYPT);
        Database::run('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [$newHash, $user['id']]);

        Audit::log($user, 'PASSWORD_CHANGED', 'USER', $user['id'], 'User successfully updated their password');
        Response::success(null, 'Password changed successfully.');
    }

    public static function forgotPassword(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $email = strtolower(trim((string) ($body['email'] ?? '')));

        if ($email === '') {
            Response::error('Email address is required.');
        }

        $record = Database::get('SELECT id, email, name FROM users WHERE email = ?', [$email]);
        if ($record) {
            Audit::log(
                ['id' => null, 'email' => $email],
                'PASSWORD_RESET_REQUESTED',
                'USER',
                $record['id'],
                ['requested_email' => $email]
            );
        }

        Response::success(null, 'Password reset request logged. For corporate security, contact the Super Administrator (admin@company.com) to verify identity.');
    }
}
