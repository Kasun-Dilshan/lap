<?php

declare(strict_types=1);

class UserController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $users = Database::all(
            'SELECT id, name, email, role, status, last_login, created_at FROM users ORDER BY id ASC'
        );
        Response::success($users);
    }

    public static function store(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $name = trim((string) ($body['name'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $role = (string) ($body['role'] ?? 'viewer');
        $status = (string) ($body['status'] ?? 'active');

        if ($name === '' || $email === '' || $password === '') {
            Response::error('Name, email, and password are required.');
        }

        $validRoles = ['super_admin', 'it_admin', 'manager', 'viewer', 'laptop_owner'];
        if (!in_array($role, $validRoles, true)) {
            Response::error('Invalid role specified.');
        }

        $exists = Database::get('SELECT id FROM users WHERE email = ?', [$email]);
        if ($exists) {
            Response::error('A user with this email already exists.');
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $result = Database::run(
            'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
            [$name, $email, $hash, $role, $status]
        );

        Audit::log($user, 'USER_CREATED', 'USER', $result['insertId'], [
            'name' => $name,
            'email' => $email,
            'role' => $role,
        ]);

        Response::success([
            'id' => $result['insertId'],
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'status' => $status,
        ], 'User created successfully.', 201);
    }

    public static function update(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $body = Request::body();
        $record = Database::get('SELECT * FROM users WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('User not found.', 404);
        }

        $passwordHash = $record['password_hash'];
        if (!empty($body['password']) && strlen(trim((string) $body['password'])) >= 6) {
            $passwordHash = password_hash(trim((string) $body['password']), PASSWORD_BCRYPT);
        }

        Database::run(
            'UPDATE users SET
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                role = COALESCE(?, role),
                status = COALESCE(?, status),
                password_hash = ?,
                updated_at = NOW()
             WHERE id = ?',
            [
                isset($body['name']) ? trim((string) $body['name']) : null,
                isset($body['email']) ? strtolower(trim((string) $body['email'])) : null,
                $body['role'] ?? null,
                $body['status'] ?? null,
                $passwordHash,
                $id,
            ]
        );

        Audit::log($user, 'USER_UPDATED', 'USER', $id, [
            'email' => $record['email'],
            'role' => $body['role'] ?? null,
            'status' => $body['status'] ?? null,
        ]);

        Response::success(null, 'User updated successfully.');
    }

    public static function destroy(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        if ($user && (string) $user['id'] === (string) $id) {
            Response::error('Cannot delete your own active administrator account.');
        }

        $record = Database::get('SELECT * FROM users WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('User not found.', 404);
        }

        Database::run('DELETE FROM users WHERE id = ?', [$id]);
        Audit::log($user, 'USER_DELETED', 'USER', $id, ['email' => $record['email']]);
        Response::success(null, 'User deleted successfully.');
    }
}
