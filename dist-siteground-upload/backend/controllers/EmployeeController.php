<?php

declare(strict_types=1);

class EmployeeController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $search = (string) Request::query('search', '');
        $departmentId = (string) Request::query('department_id', '');
        $status = (string) Request::query('status', '');

        $sql = '
            SELECT e.*, d.name as department_name, d.code as department_code,
                   (SELECT COUNT(*) FROM devices dev WHERE dev.employee_id = e.id) as assigned_devices_count
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE 1=1
        ';
        $bind = [];

        if (trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $sql .= ' AND (e.name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ? OR e.position LIKE ?)';
            array_push($bind, $term, $term, $term, $term);
        }
        if ($departmentId !== '') {
            $sql .= ' AND e.department_id = ?';
            $bind[] = $departmentId;
        }
        if ($status !== '') {
            $sql .= ' AND e.status = ?';
            $bind[] = $status;
        }

        $sql .= ' ORDER BY e.name ASC';
        Response::success(Database::all($sql, $bind));
    }

    public static function show(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $employee = Database::get(
            'SELECT e.*, d.name as department_name, d.code as department_code
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             WHERE e.id = ?',
            [$id]
        );

        if (!$employee) {
            Response::error('Employee not found.', 404);
        }

        $devices = Database::all(
            'SELECT id, device_id, asset_id, name, model, os, status, last_seen, battery_percent
             FROM devices WHERE employee_id = ?',
            [$id]
        );

        $employee['devices'] = $devices;
        Response::success($employee);
    }

    public static function store(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $employeeId = trim((string) ($body['employee_id'] ?? ''));
        $name = trim((string) ($body['name'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        if ($employeeId === '' || $name === '' || $email === '') {
            Response::error('Employee ID, Name, and Email are required.');
        }

        if (strlen(trim($password)) < 6) {
            Response::error('Password is required and must be at least 6 characters.');
        }

        $exists = Database::get('SELECT id FROM employees WHERE employee_id = ? OR email = ?', [$employeeId, $email]);
        if ($exists) {
            Response::error('An employee with this Employee ID or Email already exists.');
        }

        $userExists = Database::get('SELECT id FROM users WHERE email = ?', [$email]);
        if ($userExists) {
            Response::error('A login user with this email already exists.');
        }

        $departmentIdValue = $body['department_id'] ?? null;
        if ($departmentIdValue === '' || $departmentIdValue === null) {
            $departmentIdValue = null;
        } else {
            $departmentIdValue = (int) $departmentIdValue;
        }

        $result = Database::run(
            'INSERT INTO employees (employee_id, name, email, phone, department_id, branch, position, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, \'active\')',
            [
                $employeeId,
                $name,
                $email,
                $body['phone'] ?? null,
                $departmentIdValue,
                $body['branch'] ?? 'Headquarters',
                $body['position'] ?? null,
            ]
        );

        $hash = password_hash(trim($password), PASSWORD_BCRYPT);
        $role = (string) ($body['role'] ?? 'laptop_owner');
        $validRoles = ['super_admin', 'it_admin', 'manager', 'viewer', 'laptop_owner'];
        if (!in_array($role, $validRoles, true)) {
            $role = 'viewer';
        }

        $userResult = Database::run(
            'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, \'active\')',
            [$name, $email, $hash, $role]
        );

        Audit::log($user, 'EMPLOYEE_CREATED', 'EMPLOYEE', $employeeId, [
            'name' => $name,
            'email' => $email,
            'department_id' => $body['department_id'] ?? null,
            'user_id' => $userResult['insertId'],
        ]);

        Response::success([
            'id' => $result['insertId'],
            'user_id' => $userResult['insertId'],
        ], 'Employee created successfully.', 201);
    }

    public static function update(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $body = Request::body();
        $emp = Database::get('SELECT * FROM employees WHERE id = ?', [$id]);
        if (!$emp) {
            Response::error('Employee not found.', 404);
        }

        $newEmail = isset($body['email']) ? strtolower(trim((string) $body['email'])) : null;
        $newName = isset($body['name']) ? trim((string) $body['name']) : null;
        $password = isset($body['password']) ? trim((string) $body['password']) : '';

        if ($password !== '' && strlen($password) < 6) {
            Response::error('Password must be at least 6 characters.');
        }

        Database::run(
            'UPDATE employees SET
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                department_id = COALESCE(?, department_id),
                branch = COALESCE(?, branch),
                position = COALESCE(?, position),
                status = COALESCE(?, status),
                updated_at = NOW()
             WHERE id = ?',
            [
                $newName,
                $newEmail,
                $body['phone'] ?? null,
                $body['department_id'] ?? null,
                $body['branch'] ?? null,
                $body['position'] ?? null,
                $body['status'] ?? null,
                $id,
            ]
        );

        // Sync linked login user (matched by current employee email)
        $linkedUser = Database::get('SELECT * FROM users WHERE email = ?', [$emp['email']]);
        if ($linkedUser) {
            $passwordHash = $linkedUser['password_hash'];
            if ($password !== '') {
                $passwordHash = password_hash($password, PASSWORD_BCRYPT);
            }

            Database::run(
                'UPDATE users SET
                    name = COALESCE(?, name),
                    email = COALESCE(?, email),
                    password_hash = ?,
                    updated_at = NOW()
                 WHERE id = ?',
                [
                    $newName,
                    $newEmail,
                    $passwordHash,
                    $linkedUser['id'],
                ]
            );
        } elseif ($password !== '') {
            // Create a login account if password is provided and none exists yet
            $emailForUser = $newEmail ?? strtolower((string) $emp['email']);
            $nameForUser = $newName ?? (string) $emp['name'];
            $exists = Database::get('SELECT id FROM users WHERE email = ?', [$emailForUser]);
            if (!$exists) {
                Database::run(
                    'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, \'laptop_owner\', \'active\')',
                    [$nameForUser, $emailForUser, password_hash($password, PASSWORD_BCRYPT)]
                );
            }
        }

        Audit::log($user, 'EMPLOYEE_UPDATED', 'EMPLOYEE', $emp['employee_id'], [
            'name' => $newName,
            'email' => $newEmail,
            'status' => $body['status'] ?? null,
            'password_changed' => $password !== '',
        ]);

        Response::success(null, 'Employee updated successfully.');
    }

    public static function deactivate(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $emp = Database::get('SELECT * FROM employees WHERE id = ?', [$id]);
        if (!$emp) {
            Response::error('Employee not found.', 404);
        }

        Database::run("UPDATE employees SET status = 'inactive' WHERE id = ?", [$id]);
        Audit::log($user, 'EMPLOYEE_DEACTIVATED', 'EMPLOYEE', $emp['employee_id'], 'Employee deactivated');
        Response::success(null, 'Employee marked inactive.');
    }

    public static function destroy(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $emp = Database::get('SELECT * FROM employees WHERE id = ?', [$id]);
        if (!$emp) {
            Response::error('Employee not found.', 404);
        }

        Database::run("UPDATE devices SET employee_id = NULL, asset_status = 'available' WHERE employee_id = ?", [$id]);
        Database::run('DELETE FROM employees WHERE id = ?', [$id]);

        Audit::log($user, 'EMPLOYEE_DELETED', 'EMPLOYEE', $emp['employee_id'], ['name' => $emp['name']]);
        Response::success(null, 'Employee deleted successfully.');
    }
}
