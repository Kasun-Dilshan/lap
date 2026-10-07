<?php

declare(strict_types=1);

class ReportController
{
    private static function toCsv(array $items, array $fields): string
    {
        if (!$items) {
            return '';
        }

        $header = implode(',', array_map(static fn($f) => '"' . $f['label'] . '"', $fields));
        $rows = [];
        foreach ($items as $item) {
            $cols = [];
            foreach ($fields as $field) {
                $val = $item[$field['key']] ?? '';
                if (is_string($val)) {
                    $val = str_replace('"', '""', $val);
                }
                $cols[] = '"' . $val . '"';
            }
            $rows[] = implode(',', $cols);
        }

        return $header . "\r\n" . implode("\r\n", $rows);
    }

    private static function sendCsv(string $csv, string $filename): void
    {
        Response::text($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public static function devices(array $params, ?array $user, ?array $device, array $config): void
    {
        $format = (string) Request::query('format', 'json');
        $status = (string) Request::query('status', '');
        $os = (string) Request::query('os', '');

        $sql = '
            SELECT d.asset_id, d.name, d.model, d.manufacturer, d.serial_number,
                   d.os, d.os_version, d.status, d.asset_status, d.public_ip, d.local_ip,
                   d.battery_percent, d.battery_status, d.disk_usage, d.purchase_price,
                   d.purchase_date, d.warranty_expiry, d.last_seen,
                   e.name as employee_name, e.employee_id as employee_code,
                   dept.name as department_name
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
        $sql .= ' ORDER BY d.asset_id ASC';
        $devices = Database::all($sql, $bind);

        if ($format === 'csv') {
            self::sendCsv(self::toCsv($devices, [
                ['key' => 'asset_id', 'label' => 'Asset ID'],
                ['key' => 'name', 'label' => 'Laptop Name'],
                ['key' => 'manufacturer', 'label' => 'Manufacturer'],
                ['key' => 'model', 'label' => 'Model'],
                ['key' => 'serial_number', 'label' => 'Serial Number'],
                ['key' => 'os', 'label' => 'Operating System'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'asset_status', 'label' => 'Asset Status'],
                ['key' => 'employee_name', 'label' => 'Assigned Employee'],
                ['key' => 'department_name', 'label' => 'Department'],
                ['key' => 'battery_percent', 'label' => 'Battery %'],
                ['key' => 'disk_usage', 'label' => 'Disk Usage %'],
                ['key' => 'public_ip', 'label' => 'Public IP'],
                ['key' => 'last_seen', 'label' => 'Last Seen'],
            ]), 'device-report.csv');
        }

        Response::json(['success' => true, 'count' => count($devices), 'data' => $devices]);
    }

    public static function employees(array $params, ?array $user, ?array $device, array $config): void
    {
        $format = (string) Request::query('format', 'json');
        $rows = Database::all(
            'SELECT e.employee_id, e.name as employee_name, e.email, e.position, e.branch,
                    d.name as department_name,
                    dev.asset_id, dev.name as device_name, dev.model, dev.serial_number,
                    dev.os, dev.status as device_status, dev.battery_percent, dev.last_seen
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN devices dev ON dev.employee_id = e.id
             ORDER BY e.name ASC'
        );

        if ($format === 'csv') {
            self::sendCsv(self::toCsv($rows, [
                ['key' => 'employee_id', 'label' => 'Employee ID'],
                ['key' => 'employee_name', 'label' => 'Employee Name'],
                ['key' => 'email', 'label' => 'Email'],
                ['key' => 'department_name', 'label' => 'Department'],
                ['key' => 'branch', 'label' => 'Branch'],
                ['key' => 'position', 'label' => 'Position'],
                ['key' => 'asset_id', 'label' => 'Assigned Device Asset ID'],
                ['key' => 'device_name', 'label' => 'Device Name'],
                ['key' => 'model', 'label' => 'Model'],
                ['key' => 'device_status', 'label' => 'Device Status'],
            ]), 'employee-asset-report.csv');
        }

        Response::json(['success' => true, 'count' => count($rows), 'data' => $rows]);
    }

    public static function departments(array $params, ?array $user, ?array $device, array $config): void
    {
        $format = (string) Request::query('format', 'json');
        $rows = Database::all(
            'SELECT d.code, d.name as department_name, d.budget_allocated,
                    COUNT(DISTINCT e.id) as total_employees,
                    COUNT(DISTINCT dev.id) as total_devices,
                    SUM(CASE WHEN dev.status = \'online\' THEN 1 ELSE 0 END) as online_devices,
                    SUM(CASE WHEN dev.status = \'offline\' THEN 1 ELSE 0 END) as offline_devices,
                    SUM(CASE WHEN dev.status = \'maintenance\' THEN 1 ELSE 0 END) as maintenance_devices,
                    SUM(COALESCE(dev.purchase_price, 0)) as total_hardware_value
             FROM departments d
             LEFT JOIN employees e ON e.department_id = d.id
             LEFT JOIN devices dev ON dev.department_id = d.id
             GROUP BY d.id
             ORDER BY total_devices DESC'
        );

        if ($format === 'csv') {
            self::sendCsv(self::toCsv($rows, [
                ['key' => 'code', 'label' => 'Code'],
                ['key' => 'department_name', 'label' => 'Department'],
                ['key' => 'total_employees', 'label' => 'Total Employees'],
                ['key' => 'total_devices', 'label' => 'Total Laptops'],
                ['key' => 'online_devices', 'label' => 'Online'],
                ['key' => 'offline_devices', 'label' => 'Offline'],
                ['key' => 'maintenance_devices', 'label' => 'In Maintenance'],
                ['key' => 'total_hardware_value', 'label' => 'Total Asset Value ($)'],
            ]), 'department-report.csv');
        }

        Response::success($rows);
    }

    public static function maintenance(array $params, ?array $user, ?array $device, array $config): void
    {
        $format = (string) Request::query('format', 'json');
        $rows = Database::all(
            'SELECT m.ticket_id, m.issue, m.priority, m.status, m.technician,
                    m.reported_date, m.completed_date, m.notes,
                    d.asset_id, d.name as device_name, d.model, d.serial_number,
                    e.name as employee_name
             FROM maintenance m
             LEFT JOIN devices d ON m.device_id = d.id
             LEFT JOIN employees e ON d.employee_id = e.id
             ORDER BY m.reported_date DESC'
        );

        if ($format === 'csv') {
            self::sendCsv(self::toCsv($rows, [
                ['key' => 'ticket_id', 'label' => 'Ticket ID'],
                ['key' => 'asset_id', 'label' => 'Asset ID'],
                ['key' => 'device_name', 'label' => 'Device Name'],
                ['key' => 'issue', 'label' => 'Issue'],
                ['key' => 'priority', 'label' => 'Priority'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'technician', 'label' => 'Technician'],
                ['key' => 'reported_date', 'label' => 'Reported Date'],
                ['key' => 'completed_date', 'label' => 'Completed Date'],
                ['key' => 'notes', 'label' => 'Notes'],
            ]), 'maintenance-report.csv');
        }

        Response::json(['success' => true, 'count' => count($rows), 'data' => $rows]);
    }
}
