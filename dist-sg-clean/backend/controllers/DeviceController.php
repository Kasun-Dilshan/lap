<?php

declare(strict_types=1);

class DeviceController
{
    public static function locateIp(?string $ip): array
    {
        return self::resolveIpLocation($ip);
    }

    /**
     * Next company asset tag. Uses the highest existing SG-LAP-NNN number, not COUNT(*),
     * so deletes / gaps / custom tags do not collide with unique asset_id.
     */
    public static function nextAssetId(): string
    {
        $rows = Database::all("SELECT asset_id FROM devices WHERE asset_id LIKE 'SG-LAP-%'");
        $max = 0;
        foreach ($rows as $row) {
            if (preg_match('/^SG-LAP-(\d+)$/', (string) ($row['asset_id'] ?? ''), $match)) {
                $max = max($max, (int) $match[1]);
            }
        }

        for ($i = 0; $i < 20; $i++) {
            $candidate = 'SG-LAP-' . str_pad((string) ($max + 1 + $i), 3, '0', STR_PAD_LEFT);
            $exists = Database::get('SELECT id FROM devices WHERE asset_id = ?', [$candidate]);
            if (!$exists) {
                return $candidate;
            }
        }

        return 'SG-LAP-' . strtoupper(bin2hex(random_bytes(3)));
    }

    private static function resolveIpLocation(?string $ip): array
    {
        if (!$ip || $ip === '127.0.0.1' || $ip === '::1') {
            return [
                'city' => 'New York', 'region' => 'New York', 'country' => 'United States',
                'country_code' => 'US', 'latitude' => 40.7128, 'longitude' => -74.0060,
                'isp' => 'Corporate Headquarters LAN',
            ];
        }
        if (str_starts_with($ip, '81.') || str_contains($ip, '.uk')) {
            return [
                'city' => 'London', 'region' => 'England', 'country' => 'United Kingdom',
                'country_code' => 'GB', 'latitude' => 51.5074, 'longitude' => -0.1278,
                'isp' => 'BT Global Services',
            ];
        }
        if (str_starts_with($ip, '175.') || str_starts_with($ip, '103.')) {
            return [
                'city' => 'Singapore', 'region' => 'Central Singapore', 'country' => 'Singapore',
                'country_code' => 'SG', 'latitude' => 1.3521, 'longitude' => 103.8198,
                'isp' => 'Singtel Corporate Networks',
            ];
        }
        if (str_starts_with($ip, '192.0.2.') || str_starts_with($ip, '198.18.')) {
            return [
                'city' => 'San Francisco', 'region' => 'California', 'country' => 'United States',
                'country_code' => 'US', 'latitude' => 37.7749, 'longitude' => -122.4194,
                'isp' => 'Comcast Business Communications',
            ];
        }
        if (str_starts_with($ip, '203.0.113.')) {
            return [
                'city' => 'Chicago', 'region' => 'Illinois', 'country' => 'United States',
                'country_code' => 'US', 'latitude' => 41.8781, 'longitude' => -87.6298,
                'isp' => 'AT&T Commercial Gateway',
            ];
        }

        return [
            'city' => 'New York', 'region' => 'New York', 'country' => 'United States',
            'country_code' => 'US', 'latitude' => 40.7128, 'longitude' => -74.0060,
            'isp' => 'Apex Corporate Dedicated Uplink',
        ];
    }

    public static function stats(array $params, ?array $user, ?array $device, array $config): void
    {
        // Lightweight offline sweep when dashboard loads
        HeartbeatMonitor::checkFleet();

        $total = (int) (Database::get('SELECT COUNT(*) as count FROM devices')['count'] ?? 0);
        $online = (int) (Database::get("SELECT COUNT(*) as count FROM devices WHERE status = 'online'")['count'] ?? 0);
        $offline = (int) (Database::get("SELECT COUNT(*) as count FROM devices WHERE status = 'offline'")['count'] ?? 0);
        $maintenance = (int) (Database::get("SELECT COUNT(*) as count FROM devices WHERE status = 'maintenance'")['count'] ?? 0);
        $assigned = (int) (Database::get('SELECT COUNT(*) as count FROM devices WHERE employee_id IS NOT NULL')['count'] ?? 0);
        $unassigned = (int) (Database::get('SELECT COUNT(*) as count FROM devices WHERE employee_id IS NULL')['count'] ?? 0);
        $recentlySeen = (int) (Database::get(
            "SELECT COUNT(*) as count FROM devices WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"
        )['count'] ?? 0);
        $activeAlerts = (int) (Database::get("SELECT COUNT(*) as count FROM alerts WHERE status = 'active'")['count'] ?? 0);

        $depts = Database::all(
            'SELECT d.id, d.name, d.code, COUNT(dev.id) as device_count
             FROM departments d
             LEFT JOIN devices dev ON dev.department_id = d.id
             GROUP BY d.id, d.name, d.code
             ORDER BY device_count DESC'
        );
        $osStats = Database::all('SELECT os, COUNT(*) as count FROM devices GROUP BY os');
        $maintenanceStats = Database::all('SELECT status, COUNT(*) as count FROM maintenance GROUP BY status');

        Response::success([
            'total' => $total,
            'online' => $online,
            'offline' => $offline,
            'maintenance' => $maintenance,
            'assigned' => $assigned,
            'unassigned' => $unassigned,
            'recently_seen' => $recentlySeen,
            'active_alerts' => $activeAlerts,
            'departments' => $depts,
            'os_distribution' => $osStats,
            'maintenance_distribution' => $maintenanceStats,
        ]);
    }

    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        // Keep recently tracked owner sessions visibly ONLINE for admins.
        try {
            $onlineWindow = max(2, (int) ($config['offline_threshold_minutes'] ?? 5));
            Database::run(
                "UPDATE devices
                 SET status = 'online'
                 WHERE status = 'offline'
                   AND asset_status != 'retired'
                   AND last_seen >= DATE_SUB(NOW(), INTERVAL {$onlineWindow} MINUTE)"
            );
        } catch (Throwable $e) {
            error_log('Online status refresh skipped: ' . $e->getMessage());
        }

        $search = (string) Request::query('search', '');
        $status = (string) Request::query('status', '');
        $os = (string) Request::query('os', '');
        $departmentId = (string) Request::query('department_id', '');
        $assigned = (string) Request::query('assigned', '');
        $sortBy = (string) Request::query('sort_by', 'last_seen');
        $order = strtoupper((string) Request::query('order', 'DESC')) === 'ASC' ? 'ASC' : 'DESC';
        $page = max(1, (int) Request::query('page', 1));
        // Inventory page must return the full fleet by default (not a tiny first page).
        $limit = min(5000, max(1, (int) Request::query('limit', 2000)));

        // Correlated location lookups avoid a heavy derived-table join that can
        // fail/timeout on hosts with large device_locations history, which made
        // the unfiltered list look empty until a search narrowed the result set.
        $sql = '
            SELECT d.*, e.name as employee_name, e.employee_id as employee_code,
                   e.email as employee_email, dept.name as department_name,
                   dept.code as department_code,
                   (SELECT loc.city FROM device_locations loc
                    WHERE loc.device_id = d.id ORDER BY loc.id DESC LIMIT 1) as location_city,
                   (SELECT loc.country FROM device_locations loc
                    WHERE loc.device_id = d.id ORDER BY loc.id DESC LIMIT 1) as location_country
            FROM devices d
            LEFT JOIN employees e ON d.employee_id = e.id
            LEFT JOIN departments dept ON d.department_id = dept.id
            WHERE 1=1
        ';
        $bind = [];

        if ($status !== '' && $status !== 'all') {
            $sql .= ' AND d.status = ?';
            $bind[] = $status;
        }
        if ($os !== '' && $os !== 'all') {
            $sql .= ' AND d.os = ?';
            $bind[] = $os;
        }
        if ($departmentId !== '' && $departmentId !== 'all') {
            $sql .= ' AND d.department_id = ?';
            $bind[] = $departmentId;
        }
        if ($assigned === 'true') {
            $sql .= ' AND d.employee_id IS NOT NULL';
        } elseif ($assigned === 'false') {
            $sql .= ' AND d.employee_id IS NULL';
        }
        if (trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $sql .= ' AND (
                d.asset_id LIKE ? OR d.name LIKE ? OR d.hostname LIKE ? OR d.serial_number LIKE ?
                OR d.model LIKE ? OR d.manufacturer LIKE ? OR d.public_ip LIKE ? OR d.local_ip LIKE ?
                OR e.name LIKE ? OR dept.name LIKE ?
            )';
            array_push($bind, $term, $term, $term, $term, $term, $term, $term, $term, $term, $term);
        }

        $allowedSorts = ['last_seen', 'name', 'asset_id', 'status', 'battery_percent', 'disk_usage', 'created_at'];
        $safeSort = in_array($sortBy, $allowedSorts, true) ? "d.{$sortBy}" : 'd.last_seen';
        $sql .= " ORDER BY {$safeSort} {$order}, d.id ASC LIMIT {$limit} OFFSET " . (($page - 1) * $limit);

        $devices = Database::all($sql, $bind);

        $countSql = 'SELECT COUNT(*) as total FROM devices d
            LEFT JOIN employees e ON d.employee_id = e.id
            LEFT JOIN departments dept ON d.department_id = dept.id WHERE 1=1';
        $countBind = [];
        if ($status !== '' && $status !== 'all') {
            $countSql .= ' AND d.status = ?';
            $countBind[] = $status;
        }
        if ($os !== '' && $os !== 'all') {
            $countSql .= ' AND d.os = ?';
            $countBind[] = $os;
        }
        if ($departmentId !== '' && $departmentId !== 'all') {
            $countSql .= ' AND d.department_id = ?';
            $countBind[] = $departmentId;
        }
        if ($assigned === 'true') {
            $countSql .= ' AND d.employee_id IS NOT NULL';
        } elseif ($assigned === 'false') {
            $countSql .= ' AND d.employee_id IS NULL';
        }
        if (trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $countSql .= ' AND (
                d.asset_id LIKE ? OR d.name LIKE ? OR d.hostname LIKE ? OR d.serial_number LIKE ?
                OR d.model LIKE ? OR d.manufacturer LIKE ? OR d.public_ip LIKE ? OR d.local_ip LIKE ?
                OR e.name LIKE ? OR dept.name LIKE ?
            )';
            array_push($countBind, $term, $term, $term, $term, $term, $term, $term, $term, $term, $term);
        }

        $totalCount = (int) (Database::get($countSql, $countBind)['total'] ?? 0);

        Response::json([
            'success' => true,
            'data' => $devices,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $totalCount,
                'totalPages' => (int) ceil($totalCount / $limit),
            ],
        ]);
    }

    public static function show(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $record = Database::get(
            'SELECT d.*, e.name as employee_name, e.employee_id as employee_code,
                    e.email as employee_email, e.phone as employee_phone,
                    e.position as employee_position, dept.name as department_name,
                    dept.code as department_code
             FROM devices d
             LEFT JOIN employees e ON d.employee_id = e.id
             LEFT JOIN departments dept ON d.department_id = dept.id
             WHERE d.id = ? OR d.device_id = ?',
            [$id, $id]
        );

        if (!$record) {
            Response::error('Device not found.', 404);
        }

        $heartbeats = Database::all(
            'SELECT cpu_usage, ram_usage, disk_usage, battery_percent, battery_status, recorded_at
             FROM device_heartbeats WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 30',
            [$record['id']]
        );
        $locations = Database::all(
            'SELECT city, region, country, country_code, latitude, longitude, isp, recorded_at
             FROM device_locations WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 10',
            [$record['id']]
        );
        $assignments = Database::all(
            'SELECT da.*, e.name as employee_name, u.name as assigned_by_name
             FROM device_assignments da
             LEFT JOIN employees e ON da.employee_id = e.id
             LEFT JOIN users u ON da.assigned_by = u.id
             WHERE da.device_id = ? ORDER BY da.assigned_date DESC',
            [$record['id']]
        );
        $maintenance = Database::all(
            'SELECT * FROM maintenance WHERE device_id = ? ORDER BY reported_date DESC',
            [$record['id']]
        );
        $alerts = Database::all(
            'SELECT * FROM alerts WHERE device_id = ? ORDER BY created_at DESC LIMIT 10',
            [$record['id']]
        );

        $record['heartbeats'] = array_reverse($heartbeats);
        $record['latest_location'] = $locations[0] ?? null;
        $record['locations'] = $locations;
        $record['assignments'] = $assignments;
        $record['maintenance'] = $maintenance;
        $record['alerts'] = $alerts;

        Response::success($record);
    }

    public static function store(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $name = trim((string) ($body['name'] ?? ''));
        $manufacturer = trim((string) ($body['manufacturer'] ?? ''));
        $model = trim((string) ($body['model'] ?? ''));
        $serial = trim((string) ($body['serial_number'] ?? ''));
        $os = trim((string) ($body['os'] ?? ''));

        if ($name === '' || $manufacturer === '' || $model === '' || $serial === '' || $os === '') {
            Response::error('Name, manufacturer, model, serial number, and OS are required.');
        }

        $deviceId = 'DEV-' . strtoupper(substr($os, 0, 3)) . '-' . strtoupper(bin2hex(random_bytes(4)));
        $deviceToken = 'dev_tok_' . bin2hex(random_bytes(16));
        $assetId = trim((string) ($body['asset_id'] ?? ''));
        if ($assetId === '') {
            $assetId = self::nextAssetId();
        }

        $employeeId = $body['employee_id'] ?? null;
        $departmentId = $body['department_id'] ?? null;
        $assetStatus = $employeeId ? 'assigned' : 'available';

        $result = Database::run(
            'INSERT INTO devices (
                device_id, asset_id, name, hostname, manufacturer, model, serial_number,
                os, os_version, architecture, cpu_model, ram_total_gb, storage_total_gb,
                employee_id, department_id, branch, status, asset_status,
                purchase_date, warranty_expiry, purchase_price, supplier,
                device_token, first_seen, last_seen
             ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, \'offline\', ?,
                ?, ?, ?, ?,
                ?, NOW(), NOW()
             )',
            [
                $deviceId, $assetId, $name,
                $body['hostname'] ?? strtoupper(preg_replace('/\s+/', '-', $name)),
                $manufacturer, $model, $serial, $os,
                $body['os_version'] ?? '',
                $body['architecture'] ?? 'x64',
                $body['cpu_model'] ?? '',
                (float) ($body['ram_total_gb'] ?? 16),
                (float) ($body['storage_total_gb'] ?? 512),
                $employeeId, $departmentId,
                $body['branch'] ?? 'Headquarters',
                $assetStatus,
                $body['purchase_date'] ?? null,
                $body['warranty_expiry'] ?? null,
                (float) ($body['purchase_price'] ?? 0),
                $body['supplier'] ?? '',
                $deviceToken,
            ]
        );

        if ($employeeId) {
            Database::run(
                "INSERT INTO device_assignments (device_id, employee_id, department_id, assigned_by, notes, status)
                 VALUES (?, ?, ?, ?, 'Initial manual assignment', 'active')",
                [$result['insertId'], $employeeId, $departmentId, $user['id'] ?? null]
            );
        }

        Audit::log($user, 'DEVICE_CREATED', 'DEVICE', $assetId, [
            'name' => $name, 'model' => $model, 'serial_number' => $serial,
        ]);

        Response::success([
            'id' => $result['insertId'],
            'device_id' => $deviceId,
            'asset_id' => $assetId,
            'device_token' => $deviceToken,
        ], 'Device registered successfully.', 201);
    }

    public static function update(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $body = Request::body();
        $record = Database::get('SELECT * FROM devices WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        Database::run(
            'UPDATE devices SET
                name = COALESCE(?, name),
                asset_id = COALESCE(?, asset_id),
                hostname = COALESCE(?, hostname),
                manufacturer = COALESCE(?, manufacturer),
                model = COALESCE(?, model),
                serial_number = COALESCE(?, serial_number),
                os = COALESCE(?, os),
                os_version = COALESCE(?, os_version),
                cpu_model = COALESCE(?, cpu_model),
                ram_total_gb = COALESCE(?, ram_total_gb),
                storage_total_gb = COALESCE(?, storage_total_gb),
                branch = COALESCE(?, branch),
                purchase_date = COALESCE(?, purchase_date),
                warranty_expiry = COALESCE(?, warranty_expiry),
                purchase_price = COALESCE(?, purchase_price),
                supplier = COALESCE(?, supplier),
                asset_status = COALESCE(?, asset_status),
                updated_at = NOW()
             WHERE id = ?',
            [
                $body['name'] ?? null, $body['asset_id'] ?? null, $body['hostname'] ?? null,
                $body['manufacturer'] ?? null, $body['model'] ?? null, $body['serial_number'] ?? null,
                $body['os'] ?? null, $body['os_version'] ?? null, $body['cpu_model'] ?? null,
                $body['ram_total_gb'] ?? null, $body['storage_total_gb'] ?? null, $body['branch'] ?? null,
                $body['purchase_date'] ?? null, $body['warranty_expiry'] ?? null,
                $body['purchase_price'] ?? null, $body['supplier'] ?? null, $body['asset_status'] ?? null,
                $id,
            ]
        );

        Audit::log($user, 'DEVICE_UPDATED', 'DEVICE', $record['asset_id'], [
            'updated_fields' => array_keys($body),
        ]);
        Response::success(null, 'Device updated successfully.');
    }

    public static function assign(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $body = Request::body();
        $record = Database::get('SELECT * FROM devices WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        Database::run(
            "UPDATE device_assignments SET status = 'transferred', unassigned_date = NOW()
             WHERE device_id = ? AND status = 'active'",
            [$id]
        );

        Database::run(
            "INSERT INTO device_assignments (device_id, employee_id, department_id, assigned_by, notes, status)
             VALUES (?, ?, ?, ?, ?, 'active')",
            [
                $id,
                $body['employee_id'] ?? null,
                $body['department_id'] ?? null,
                $user['id'] ?? null,
                $body['notes'] ?? 'Reassigned via dashboard',
            ]
        );

        Database::run(
            "UPDATE devices SET employee_id = ?, department_id = ?, assigned_date = NOW(),
                asset_status = 'assigned', updated_at = NOW() WHERE id = ?",
            [$body['employee_id'] ?? null, $body['department_id'] ?? null, $id]
        );

        Audit::log($user, 'DEVICE_ASSIGNED', 'DEVICE', $record['asset_id'], $body);
        Response::success(null, 'Device assigned successfully.');
    }

    public static function unassign(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $record = Database::get('SELECT * FROM devices WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        Database::run(
            "UPDATE device_assignments SET status = 'returned', unassigned_date = NOW()
             WHERE device_id = ? AND status = 'active'",
            [$id]
        );
        Database::run(
            "UPDATE devices SET employee_id = NULL, assigned_date = NULL,
                asset_status = 'available', updated_at = NOW() WHERE id = ?",
            [$id]
        );

        Audit::log($user, 'DEVICE_UNASSIGNED', 'DEVICE', $record['asset_id'], 'Unassigned from employee, returned to available asset pool');
        Response::success(null, 'Device unassigned successfully.');
    }

    public static function toggleMaintenance(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $body = Request::body();
        $record = Database::get('SELECT * FROM devices WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        if ($record['status'] === 'maintenance') {
            Database::run(
                "UPDATE devices SET status = 'offline',
                    asset_status = CASE WHEN employee_id IS NOT NULL THEN 'assigned' ELSE 'available' END,
                    updated_at = NOW() WHERE id = ?",
                [$id]
            );
            Database::run(
                "UPDATE maintenance SET status = 'completed', completed_date = NOW()
                 WHERE device_id = ? AND status != 'completed'",
                [$id]
            );
            Audit::log($user, 'MAINTENANCE_COMPLETED', 'DEVICE', $record['asset_id'], 'Device cleared from maintenance mode');
            Response::success(null, 'Device restored from maintenance.');
        }

        Database::run(
            "UPDATE devices SET status = 'maintenance', asset_status = 'maintenance', updated_at = NOW() WHERE id = ?",
            [$id]
        );

        $ticketId = 'MNT-' . date('Y') . '-' . (string) random_int(100, 999);
        Database::run(
            "INSERT INTO maintenance (ticket_id, device_id, issue, priority, status, technician, created_by)
             VALUES (?, ?, ?, ?, 'open', ?, ?)",
            [
                $ticketId, $id,
                $body['issue'] ?? 'Routine hardware diagnostics',
                $body['priority'] ?? 'medium',
                $body['technician'] ?? 'IT Helpdesk',
                $user['id'] ?? null,
            ]
        );

        Audit::log($user, 'MAINTENANCE_INITIATED', 'DEVICE', $record['asset_id'], [
            'ticket_id' => $ticketId,
            'issue' => $body['issue'] ?? null,
            'priority' => $body['priority'] ?? 'medium',
        ]);

        Response::json([
            'success' => true,
            'message' => 'Device moved to maintenance mode and ticket created.',
            'ticketId' => $ticketId,
        ]);
    }

    public static function deactivate(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $record = Database::get('SELECT * FROM devices WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        Database::run("UPDATE devices SET status = 'deactivated', asset_status = 'retired' WHERE id = ?", [$id]);
        Audit::log($user, 'DEVICE_DEACTIVATED', 'DEVICE', $record['asset_id'], 'Device retired/deactivated from active fleet');
        Response::success(null, 'Device successfully deactivated.');
    }

    /**
     * IT-only: revoke the background tracking agent on a laptop without deleting inventory.
     */
    public static function removeAgent(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = (int) ($params['id'] ?? 0);
        $record = Database::get('SELECT * FROM devices WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        Database::run(
            'UPDATE devices SET agent_allowed = 0, agent_installed_at = NULL, device_token = NULL WHERE id = ?',
            [$id]
        );

        Audit::log($user, 'AGENT_REMOVED', 'DEVICE', $record['asset_id'], [
            'message' => 'Background tracking agent revoked by administrator',
            'hostname' => $record['hostname'],
        ]);

        Database::run(
            "INSERT INTO notifications (title, message, type, link)
             VALUES (?, ?, 'warning', ?)",
            [
                'Tracking agent removed',
                "IT removed the monitoring agent from {$record['asset_id']} ({$record['hostname']}).",
                "/devices/{$id}",
            ]
        );

        Response::success(null, 'Tracking agent removed from this laptop. Only an administrator can reinstall it via owner sign-in.');
    }

    public static function allowAgent(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = (int) ($params['id'] ?? 0);
        $record = Database::get('SELECT * FROM devices WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        Database::run('UPDATE devices SET agent_allowed = 1 WHERE id = ?', [$id]);
        Audit::log($user, 'AGENT_ALLOWED', 'DEVICE', $record['asset_id'], 'Administrator allowed tracking agent installation again');
        Response::success(null, 'This laptop may install the tracking agent again on the next owner sign-in.');
    }

    public static function destroy(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $record = Database::get('SELECT * FROM devices WHERE id = ?', [$id]);
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        Database::run('DELETE FROM devices WHERE id = ?', [$id]);
        Audit::log($user, 'DEVICE_DELETED', 'DEVICE', $record['asset_id'], [
            'deleted_name' => $record['name'],
            'serial' => $record['serial_number'],
        ]);
        Response::success(null, 'Device deleted permanently.');
    }

    public static function register(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $enrollmentToken = trim((string) ($body['enrollment_token'] ?? ''));
        $deviceId = (string) ($body['device_id'] ?? '');
        $serial = (string) ($body['serial_number'] ?? '');
        $os = (string) ($body['os'] ?? '');

        if ($enrollmentToken === '' || $deviceId === '' || $serial === '' || $os === '') {
            Response::error('Enrollment token, device_id, serial_number, and OS are required.');
        }

        $tokenRecord = Database::get(
            "SELECT * FROM enrollment_tokens
             WHERE token = ? AND status = 'active' AND expires_at > NOW()",
            [$enrollmentToken]
        );
        if (!$tokenRecord) {
            Response::error('Invalid, expired, or deactivated enrollment token.');
        }

        if ((int) $tokenRecord['uses_count'] >= (int) $tokenRecord['max_uses']) {
            Database::run("UPDATE enrollment_tokens SET status = 'exhausted' WHERE id = ?", [$tokenRecord['id']]);
            Response::error('Enrollment token has reached maximum usage limit.');
        }

        $existing = Database::get(
            'SELECT * FROM devices WHERE device_id = ? OR serial_number = ?',
            [$deviceId, $serial]
        );

        $deviceToken = 'dev_tok_' . bin2hex(random_bytes(16));
        $finalAssetId = $existing['asset_id'] ?? null;
        $hostname = $body['hostname'] ?? 'WORKSTATION';
        $publicIp = $body['public_ip'] ?? Auth::clientIp();

        if (!$existing) {
            $finalAssetId = self::nextAssetId();

            $result = Database::run(
                'INSERT INTO devices (
                    device_id, asset_id, name, hostname, manufacturer, model, serial_number,
                    os, os_version, architecture, cpu_model, ram_total_gb, storage_total_gb,
                    mac_address, local_ip, public_ip, status, asset_status,
                    device_token, enrollment_token_id, first_seen, last_seen
                 ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, \'online\', \'available\',
                    ?, ?, NOW(), NOW()
                 )',
                [
                    $deviceId, $finalAssetId, "{$hostname} ({$os})", $hostname,
                    $body['manufacturer'] ?? 'Standard OEM',
                    $body['model'] ?? 'Corporate Laptop',
                    $serial, $os,
                    $body['os_version'] ?? '',
                    $body['architecture'] ?? 'x64',
                    $body['cpu_model'] ?? '',
                    (float) ($body['ram_total_gb'] ?? 16),
                    (float) ($body['storage_total_gb'] ?? 512),
                    $body['mac_address'] ?? '',
                    $body['local_ip'] ?? '',
                    $publicIp,
                    $deviceToken,
                    $tokenRecord['id'],
                ]
            );

            $existing = ['id' => $result['insertId']];
            $loc = self::resolveIpLocation((string) $publicIp);
            Database::run(
                'INSERT INTO device_locations (device_id, public_ip, city, region, country, country_code, latitude, longitude, isp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $result['insertId'], $publicIp ?: '127.0.0.1',
                    $loc['city'], $loc['region'], $loc['country'], $loc['country_code'],
                    $loc['latitude'], $loc['longitude'], $loc['isp'],
                ]
            );
        } else {
            Database::run(
                'UPDATE devices SET
                    device_token = ?,
                    hostname = COALESCE(?, hostname),
                    os_version = COALESCE(?, os_version),
                    cpu_model = COALESCE(?, cpu_model),
                    ram_total_gb = COALESCE(?, ram_total_gb),
                    storage_total_gb = COALESCE(?, storage_total_gb),
                    mac_address = COALESCE(?, mac_address),
                    local_ip = COALESCE(?, local_ip),
                    public_ip = COALESCE(?, public_ip),
                    status = \'online\',
                    last_seen = NOW()
                 WHERE id = ?',
                [
                    $deviceToken,
                    $body['hostname'] ?? null,
                    $body['os_version'] ?? null,
                    $body['cpu_model'] ?? null,
                    $body['ram_total_gb'] ?? null,
                    $body['storage_total_gb'] ?? null,
                    $body['mac_address'] ?? null,
                    $body['local_ip'] ?? null,
                    $publicIp,
                    $existing['id'],
                ]
            );
        }

        Database::run(
            "UPDATE enrollment_tokens
             SET uses_count = uses_count + 1,
                 status = CASE WHEN uses_count + 1 >= max_uses THEN 'exhausted' ELSE status END
             WHERE id = ?",
            [$tokenRecord['id']]
        );

        Database::run(
            "INSERT INTO notifications (title, message, type, link)
             VALUES (?, ?, 'success', ?)",
            [
                'New Device Enrolled',
                "Device {$finalAssetId} ({$hostname}) successfully enrolled using token {$tokenRecord['name']}.",
                "/devices/{$existing['id']}",
            ]
        );

        Audit::log(null, 'DEVICE_ENROLLED', 'DEVICE', $finalAssetId, [
            'enrollment_token' => $tokenRecord['name'],
            'device_id' => $deviceId,
            'hostname' => $hostname,
            'os' => $os,
        ]);

        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';

        Response::success([
            'device_id' => $deviceId,
            'asset_id' => $finalAssetId,
            'device_token' => $deviceToken,
            'heartbeat_interval' => $config['heartbeat_interval_seconds'],
            'server_url' => "{$scheme}://{$host}",
        ], 'Device enrolled successfully.');
    }

    public static function heartbeat(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $cpu = (float) ($body['cpu_usage'] ?? 0);
        $ram = (float) ($body['ram_usage'] ?? 0);
        $disk = (float) ($body['disk_usage'] ?? 0);
        $battery = (int) ($body['battery_percent'] ?? 100);
        $batteryStatus = (string) ($body['battery_status'] ?? 'Plugged In');
        $localIp = (string) ($body['local_ip'] ?? '');
        $detectedPublicIp = (string) ($body['public_ip'] ?? Auth::clientIp() ?: ($device['public_ip'] ?? '127.0.0.1'));

        Database::run(
            "UPDATE devices SET
                status = 'online', cpu_usage = ?, ram_usage = ?, disk_usage = ?,
                battery_percent = ?, battery_status = ?, public_ip = ?,
                local_ip = COALESCE(NULLIF(?, ''), local_ip), last_seen = NOW(),
                agent_installed_at = COALESCE(agent_installed_at, NOW())
             WHERE id = ?",
            [$cpu, $ram, $disk, $battery, $batteryStatus, $detectedPublicIp, $localIp, $device['id']]
        );

        Database::run(
            "INSERT INTO device_heartbeats (
                device_id, cpu_usage, ram_usage, disk_usage,
                battery_percent, battery_status, public_ip, local_ip, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online')",
            [$device['id'], $cpu, $ram, $disk, $battery, $batteryStatus, $detectedPublicIp, $localIp]
        );

        if ($detectedPublicIp && $detectedPublicIp !== ($device['public_ip'] ?? null)) {
            $loc = self::resolveIpLocation($detectedPublicIp);
            Database::run(
                'INSERT INTO device_locations (device_id, public_ip, city, region, country, country_code, latitude, longitude, isp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $device['id'], $detectedPublicIp,
                    $loc['city'], $loc['region'], $loc['country'], $loc['country_code'],
                    $loc['latitude'], $loc['longitude'], $loc['isp'],
                ]
            );
        }

        if ($disk >= 90) {
            $existingAlert = Database::get(
                "SELECT id FROM alerts WHERE device_id = ? AND alert_type = 'low_disk' AND status = 'active'",
                [$device['id']]
            );
            if (!$existingAlert) {
                Database::run(
                    "INSERT INTO alerts (device_id, alert_type, severity, title, message, status)
                     VALUES (?, 'low_disk', 'warning', 'High Disk Usage Detected', ?, 'active')",
                    [$device['id'], "Device {$device['asset_id']} storage usage reached {$disk}%. Action recommended."]
                );
            }
        }

        if ($battery <= 15 && str_contains(strtolower($batteryStatus), 'discharg')) {
            $existingAlert = Database::get(
                "SELECT id FROM alerts WHERE device_id = ? AND alert_type = 'low_battery' AND status = 'active'",
                [$device['id']]
            );
            if (!$existingAlert) {
                Database::run(
                    "INSERT INTO alerts (device_id, alert_type, severity, title, message, status)
                     VALUES (?, 'low_battery', 'warning', 'Critical Battery Level', ?, 'active')",
                    [$device['id'], "Device {$device['asset_id']} battery is at {$battery}%."]
                );
            }
        }

        Response::json([
            'success' => true,
            'message' => 'Heartbeat acknowledged.',
            'server_time' => date('c'),
            'heartbeat_interval' => $config['heartbeat_interval_seconds'],
        ]);
    }
}
