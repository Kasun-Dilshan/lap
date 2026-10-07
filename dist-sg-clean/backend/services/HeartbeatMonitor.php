<?php

declare(strict_types=1);

class HeartbeatMonitor
{
    public static function checkFleet(): int
    {
        $thresholdSetting = Database::get(
            "SELECT setting_value FROM settings WHERE setting_key = 'offline_threshold_minutes'"
        );
        $thresholdMinutes = $thresholdSetting
            ? max(1, (int) $thresholdSetting['setting_value'])
            : 5;

        $overdueDevices = Database::all(
            "SELECT id, asset_id, name, last_seen
             FROM devices
             WHERE status = 'online'
               AND last_seen < DATE_SUB(NOW(), INTERVAL {$thresholdMinutes} MINUTE)"
        );

        foreach ($overdueDevices as $dev) {
            Database::run("UPDATE devices SET status = 'offline' WHERE id = ?", [$dev['id']]);

            $existing = Database::get(
                "SELECT id FROM alerts WHERE device_id = ? AND alert_type = 'offline' AND status = 'active'",
                [$dev['id']]
            );

            if (!$existing) {
                Database::run(
                    "INSERT INTO alerts (device_id, alert_type, severity, title, message, status)
                     VALUES (?, 'offline', 'critical', 'Device Went Offline', ?, 'active')",
                    [
                        $dev['id'],
                        "Device {$dev['asset_id']} ({$dev['name']}) has ceased transmitting heartbeats for over {$thresholdMinutes} minutes.",
                    ]
                );

                Database::run(
                    "INSERT INTO notifications (title, message, type, link)
                     VALUES (?, ?, 'critical', ?)",
                    [
                        "Device Offline: {$dev['asset_id']}",
                        "Laptop {$dev['asset_id']} stopped sending telemetry. Last heartbeat: {$dev['last_seen']}",
                        "/devices/{$dev['id']}",
                    ]
                );
            }
        }

        $warrantyDevices = Database::all(
            "SELECT id, asset_id, name, warranty_expiry
             FROM devices
             WHERE warranty_expiry IS NOT NULL
               AND warranty_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
               AND warranty_expiry >= DATE_SUB(CURDATE(), INTERVAL 10 DAY)"
        );

        foreach ($warrantyDevices as $dev) {
            $existingWarranty = Database::get(
                "SELECT id FROM alerts WHERE device_id = ? AND alert_type = 'warranty_expiring' AND status = 'active'",
                [$dev['id']]
            );

            if (!$existingWarranty) {
                Database::run(
                    "INSERT INTO alerts (device_id, alert_type, severity, title, message, status)
                     VALUES (?, 'warranty_expiring', 'info', 'Warranty Expiring Soon', ?, 'active')",
                    [
                        $dev['id'],
                        "Manufacturer warranty for {$dev['asset_id']} ({$dev['name']}) expires on {$dev['warranty_expiry']}.",
                    ]
                );
            }
        }

        return count($overdueDevices);
    }
}
