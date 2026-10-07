<?php

declare(strict_types=1);

class AlertController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $status = (string) Request::query('status', '');
        $severity = (string) Request::query('severity', '');
        $alertType = (string) Request::query('alert_type', '');

        $sql = '
            SELECT a.*, d.asset_id as device_asset_id, d.name as device_name,
                   d.model as device_model, d.status as device_status, d.os as device_os,
                   e.name as employee_name,
                   u_ack.name as acknowledged_by_name,
                   u_res.name as resolved_by_name
            FROM alerts a
            LEFT JOIN devices d ON a.device_id = d.id
            LEFT JOIN employees e ON d.employee_id = e.id
            LEFT JOIN users u_ack ON a.acknowledged_by = u_ack.id
            LEFT JOIN users u_res ON a.resolved_by = u_res.id
            WHERE 1=1
        ';
        $bind = [];

        if ($status !== '' && $status !== 'all') {
            $sql .= ' AND a.status = ?';
            $bind[] = $status;
        }
        if ($severity !== '' && $severity !== 'all') {
            $sql .= ' AND a.severity = ?';
            $bind[] = $severity;
        }
        if ($alertType !== '' && $alertType !== 'all') {
            $sql .= ' AND a.alert_type = ?';
            $bind[] = $alertType;
        }

        $sql .= ' ORDER BY a.created_at DESC';
        Response::success(Database::all($sql, $bind));
    }

    public static function acknowledge(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $alert = Database::get('SELECT * FROM alerts WHERE id = ?', [$id]);
        if (!$alert) {
            Response::error('Alert not found.', 404);
        }

        Database::run(
            "UPDATE alerts SET status = 'acknowledged', acknowledged_by = ? WHERE id = ?",
            [$user['id'] ?? null, $id]
        );

        Audit::log($user, 'ALERT_ACKNOWLEDGED', 'ALERT', $id, ['title' => $alert['title']]);
        Response::success(null, 'Alert marked acknowledged.');
    }

    public static function resolve(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $alert = Database::get('SELECT * FROM alerts WHERE id = ?', [$id]);
        if (!$alert) {
            Response::error('Alert not found.', 404);
        }

        Database::run(
            "UPDATE alerts SET status = 'resolved', resolved_by = ?, resolved_at = NOW() WHERE id = ?",
            [$user['id'] ?? null, $id]
        );

        Audit::log($user, 'ALERT_RESOLVED', 'ALERT', $id, ['title' => $alert['title']]);
        Response::success(null, 'Alert resolved.');
    }

    public static function check(array $params, ?array $user, ?array $device, array $config): void
    {
        $marked = HeartbeatMonitor::checkFleet();
        Response::json([
            'success' => true,
            'message' => 'Fleet alerts checked successfully.',
            'overdue_marked_offline' => $marked,
        ]);
    }
}
