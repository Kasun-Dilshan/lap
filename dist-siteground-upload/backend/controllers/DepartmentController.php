<?php

declare(strict_types=1);

class DepartmentController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $departments = Database::all(
            'SELECT d.*,
                    COUNT(DISTINCT e.id) as employee_count,
                    COUNT(DISTINCT dev.id) as device_count,
                    SUM(CASE WHEN dev.status = \'online\' THEN 1 ELSE 0 END) as online_device_count,
                    SUM(COALESCE(dev.purchase_price, 0)) as total_asset_value
             FROM departments d
             LEFT JOIN employees e ON e.department_id = d.id
             LEFT JOIN devices dev ON dev.department_id = d.id
             GROUP BY d.id
             ORDER BY d.name ASC'
        );
        Response::success($departments);
    }

    public static function store(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $name = trim((string) ($body['name'] ?? ''));
        $code = strtoupper(trim((string) ($body['code'] ?? '')));

        if ($name === '' || $code === '') {
            Response::error('Department name and code are required.');
        }

        $exists = Database::get('SELECT id FROM departments WHERE name = ? OR code = ?', [$name, $code]);
        if ($exists) {
            Response::error('Department name or code already exists.');
        }

        $result = Database::run(
            'INSERT INTO departments (name, code, description, budget_allocated) VALUES (?, ?, ?, ?)',
            [$name, $code, $body['description'] ?? null, (float) ($body['budget_allocated'] ?? 0)]
        );

        Audit::log($user, 'DEPARTMENT_CREATED', 'DEPARTMENT', $code, [
            'name' => $name,
            'budget_allocated' => $body['budget_allocated'] ?? 0,
        ]);

        Response::success(['id' => $result['insertId']], 'Department created successfully.', 201);
    }

    public static function update(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $body = Request::body();
        $dept = Database::get('SELECT * FROM departments WHERE id = ?', [$id]);
        if (!$dept) {
            Response::error('Department not found.', 404);
        }

        Database::run(
            'UPDATE departments SET
                name = COALESCE(?, name),
                code = COALESCE(?, code),
                description = COALESCE(?, description),
                budget_allocated = COALESCE(?, budget_allocated),
                updated_at = NOW()
             WHERE id = ?',
            [
                isset($body['name']) ? trim((string) $body['name']) : null,
                isset($body['code']) ? strtoupper(trim((string) $body['code'])) : null,
                $body['description'] ?? null,
                array_key_exists('budget_allocated', $body) ? (float) $body['budget_allocated'] : null,
                $id,
            ]
        );

        Audit::log($user, 'DEPARTMENT_UPDATED', 'DEPARTMENT', $dept['code'], $body);
        Response::success(null, 'Department updated successfully.');
    }

    public static function destroy(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $dept = Database::get('SELECT * FROM departments WHERE id = ?', [$id]);
        if (!$dept) {
            Response::error('Department not found.', 404);
        }

        Database::run('UPDATE employees SET department_id = NULL WHERE department_id = ?', [$id]);
        Database::run('UPDATE devices SET department_id = NULL WHERE department_id = ?', [$id]);
        Database::run('DELETE FROM departments WHERE id = ?', [$id]);

        Audit::log($user, 'DEPARTMENT_DELETED', 'DEPARTMENT', $dept['code'], ['name' => $dept['name']]);
        Response::success(null, 'Department deleted successfully.');
    }
}
