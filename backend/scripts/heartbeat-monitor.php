<?php

declare(strict_types=1);

/**
 * Optional background fleet monitor.
 * Usage: php scripts/heartbeat-monitor.php
 * Or cron every minute: * * * * * php /path/to/backend/scripts/heartbeat-monitor.php
 */

$config = require dirname(__DIR__) . '/src/bootstrap.php';

echo '[' . date('c') . "] Heartbeat monitor running...\n";

while (true) {
    try {
        $marked = HeartbeatMonitor::checkFleet();
        echo '[' . date('c') . "] Checked fleet. Marked offline: {$marked}\n";
    } catch (Throwable $e) {
        echo '[' . date('c') . '] Error: ' . $e->getMessage() . "\n";
    }
    sleep(30);
}
