<?php

declare(strict_types=1);

class MaintenanceController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $status = (string) Request::query('status', '');
        $priority = (string) Request::query('priority', '');
        $deviceId = (string) Request::query('device_id', '');

        $sql = '
            SELECT m.*, d.asset_id as device_asset_id, d.name as device_name,
                   d.model as device_model, d.serial_number as device_serial, d.os as device_os,
                   e.name as employee_name, u.name as created_by_name
            FROM maintenance m
            LEFT JOIN devices d ON m.device_id = d.id
            LEFT JOIN employees e ON d.employee_id = e.id
            LEFT JOIN users u ON m.created_by = u.id
            WHERE 1=1
        ';
        $bind = [];

        if ($status !== '' && $status !== 'all') {
            $sql .= ' AND m.status = ?';
            $bind[] = $status;
        }
        if ($priority !== '' && $priority !== 'all') {
            $sql .= ' AND m.priority = ?';
            $bind[] = $priority;
        }
        if ($deviceId !== '') {
            $sql .= ' AND m.device_id = ?';
            $bind[] = $deviceId;
        }

        $sql .= ' ORDER BY m.reported_date DESC';
        Response::success(Database::all($sql, $bind));
    }

    public static function show(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $ticket = Database::get(
            'SELECT m.*, d.asset_id as device_asset_id, d.name as device_name,
                    d.model as device_model, d.serial_number as device_serial,
                    d.status as device_current_status, e.name as employee_name
             FROM maintenance m
             LEFT JOIN devices d ON m.device_id = d.id
             LEFT JOIN employees e ON d.employee_id = e.id
             WHERE m.id = ? OR m.ticket_id = ?',
            [$id, $id]
        );

        if (!$ticket) {
            Response::error('Maintenance ticket not found.', 404);
        }

        Response::success($ticket);
    }

    public static function store(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $deviceId = $body['device_id'] ?? null;
        $issue = trim((string) ($body['issue'] ?? ''));

        if (!$deviceId || $issue === '') {
            Response::error('Device ID and issue description are required.');
        }

        $dev = Database::get('SELECT * FROM devices WHERE id = ?', [$deviceId]);
        if (!$dev) {
            Response::error('Associated device not found.', 404);
        }

        $count = (int) (Database::get('SELECT COUNT(*) as c FROM maintenance')['c'] ?? 0);
        $ticketId = 'MNT-' . date('Y') . '-' . str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT);

        $result = Database::run(
            'INSERT INTO maintenance (ticket_id, device_id, issue, priority, status, technician, notes, created_by)
             VALUES (?, ?, ?, ?, \'open\', ?, ?, ?)',
            [
                $ticketId,
                $deviceId,
                $issue,
                $body['priority'] ?? 'medium',
                $body['technician'] ?? 'Unassigned IT Tech',
                $body['notes'] ?? null,
                $user['id'] ?? null,
            ]
        );

        Database::run("UPDATE devices SET status = 'maintenance', asset_status = 'maintenance' WHERE id = ?", [$deviceId]);

        Audit::log($user, 'MAINTENANCE_TICKET_CREATED', 'MAINTENANCE', $ticketId, [
            'device_asset_id' => $dev['asset_id'],
            'issue' => $issue,
            'priority' => $body['priority'] ?? 'medium',
        ]);

        Response::success(
            ['id' => $result['insertId'], 'ticket_id' => $ticketId],
            'Maintenance ticket created successfully.',
            201
        );
    }

    public static function update(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $body = Request::body();
        $ticket = Database::get('SELECT * FROM maintenance WHERE id = ?', [$id]);
        if (!$ticket) {
            Response::error('Ticket not found.', 404);
        }

        $status = $body['status'] ?? null;
        $isCompleting = $status === 'completed' && $ticket['status'] !== 'completed';

        Database::run(
            'UPDATE maintenance SET
                status = COALESCE(?, status),
                priority = COALESCE(?, priority),
                technician = COALESCE(?, technician),
                notes = COALESCE(?, notes),
                issue = COALESCE(?, issue),
                completed_date = CASE WHEN ? = \'completed\' THEN NOW() ELSE completed_date END,
                updated_at = NOW()
             WHERE id = ?',
            [
                $status,
                $body['priority'] ?? null,
                $body['technician'] ?? null,
                $body['notes'] ?? null,
                $body['issue'] ?? null,
                $status,
                $id,
            ]
        );

        if ($isCompleting) {
            $remaining = Database::get(
                "SELECT COUNT(*) as count FROM maintenance WHERE device_id = ? AND status != 'completed' AND id != ?",
                [$ticket['device_id'], $id]
            );
            if ((int) ($remaining['count'] ?? 0) === 0) {
                $dev = Database::get('SELECT employee_id FROM devices WHERE id = ?', [$ticket['device_id']]);
                $assetStatus = ($dev && $dev['employee_id']) ? 'assigned' : 'available';
                Database::run(
                    "UPDATE devices SET status = 'offline', asset_status = ? WHERE id = ?",
                    [$assetStatus, $ticket['device_id']]
                );
            }
        }

        Audit::log($user, 'MAINTENANCE_TICKET_UPDATED', 'MAINTENANCE', $ticket['ticket_id'], [
            'status' => $status,
            'technician' => $body['technician'] ?? null,
        ]);

        Response::success(null, 'Maintenance ticket updated successfully.');
    }

    public static function destroy(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $ticket = Database::get('SELECT * FROM maintenance WHERE id = ?', [$id]);
        if (!$ticket) {
            Response::error('Ticket not found.', 404);
        }

        Database::run('DELETE FROM maintenance WHERE id = ?', [$id]);
        Audit::log($user, 'MAINTENANCE_TICKET_DELETED', 'MAINTENANCE', $ticket['ticket_id'], [
            'issue' => $ticket['issue'],
        ]);
        Response::success(null, 'Maintenance ticket deleted.');
    }
}
