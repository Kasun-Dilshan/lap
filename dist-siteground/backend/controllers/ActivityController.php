<?php

declare(strict_types=1);

/**
 * Company-laptop work tracking.
 * Records installed software, which application is in use, and session events.
 * Does not store keystrokes, screenshots, passwords, window titles, or page contents.
 */
class ActivityController
{
    private const EVENT_TYPES = [
        'session_start',
        'session_end',
        'screen_lock',
        'screen_unlock',
        'app_focus',
        'app_close',
        'software_installed',
        'software_removed',
        'inventory_sync',
    ];

    public static function ensureSchema(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        try {
            $pdo = Database::pdo();
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS device_software (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    device_id INT NOT NULL,
                    name VARCHAR(180) NOT NULL,
                    version VARCHAR(80) NULL,
                    publisher VARCHAR(150) NULL,
                    is_running TINYINT(1) NOT NULL DEFAULT 0,
                    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    removed_at DATETIME NULL,
                    UNIQUE KEY uniq_device_software (device_id, name),
                    INDEX idx_software_device (device_id),
                    INDEX idx_software_name (name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS device_app_sessions (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    device_id INT NOT NULL,
                    app_name VARCHAR(180) NOT NULL,
                    windows_user VARCHAR(80) NULL,
                    started_at DATETIME NOT NULL,
                    ended_at DATETIME NULL,
                    duration_seconds INT NOT NULL DEFAULT 0,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    INDEX idx_usage_device_time (device_id, started_at),
                    INDEX idx_usage_active (device_id, is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS device_activities (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    device_id INT NOT NULL,
                    event_type VARCHAR(40) NOT NULL,
                    app_name VARCHAR(180) NULL,
                    windows_user VARCHAR(80) NULL,
                    summary VARCHAR(255) NOT NULL,
                    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_activity_device_time (device_id, occurred_at),
                    INDEX idx_activity_type (event_type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
            );

            $columns = [
                'current_app' => 'VARCHAR(180) NULL',
                'windows_user' => 'VARCHAR(80) NULL',
                'session_state' => 'VARCHAR(30) NULL',
            ];
            foreach ($columns as $name => $definition) {
                $exists = Database::get(
                    'SELECT COLUMN_NAME FROM information_schema.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
                    ['devices', $name]
                );
                if (!$exists) {
                    $pdo->exec("ALTER TABLE devices ADD COLUMN {$name} {$definition}");
                }
            }
        } catch (Throwable $e) {
            error_log('Work activity schema setup failed: ' . $e->getMessage());
            return;
        }

        $ready = true;
    }

    public static function report(array $params, ?array $user, ?array $device, array $config): void
    {
        $result = self::applyReport($device, Request::body());
        Response::success($result, 'Work activity recorded.');
    }

    /**
     * Shared work-activity ingest for agent heartbeats and laptop-owner tracking.
     * Stores open apps, app focus, and software inventory for admin visibility.
     */
    public static function applyReport(?array $device, array $body): array
    {
        self::ensureSchema();
        if (!$device || empty($device['id'])) {
            return ['accepted' => false];
        }

        $deviceId = (int) $device['id'];
        $windowsUser = self::clean((string) ($body['windows_user'] ?? ''), 80);
        $sessionState = (string) ($body['session_state'] ?? 'active');
        if (($body['event'] ?? '') === 'session_end') {
            $sessionState = 'logged_off';
        }
        if (!in_array($sessionState, ['active', 'locked', 'logged_off'], true)) {
            $sessionState = 'active';
        }

        $foreground = self::friendlyApp((string) ($body['foreground_app'] ?? ''));
        if (in_array(strtolower($foreground), ['lockapp', 'logonui'], true)) {
            $sessionState = 'locked';
            $foreground = '';
        }

        $previousState = (string) ($device['session_state'] ?? '');
        self::recordSessionTransition($deviceId, $windowsUser, $previousState, $sessionState);

        if (!empty($body['full_inventory']) && is_array($body['software'] ?? null)) {
            self::syncSoftware($deviceId, $windowsUser, $body['software']);
        } elseif (is_array($body['software'] ?? null) && count($body['software']) > 0) {
            self::syncSoftware($deviceId, $windowsUser, $body['software']);
        }

        $running = [];
        if (is_array($body['running_apps'] ?? null)) {
            foreach (array_slice($body['running_apps'], 0, 60) as $app) {
                $name = self::friendlyApp(is_string($app) ? $app : (is_array($app) ? (string) ($app['name'] ?? '') : ''));
                if ($name !== '') {
                    $running[] = $name;
                }
            }
        }
        if ($sessionState === 'active' && $foreground !== '') {
            $running[] = $foreground;
        }
        $running = array_values(array_unique($running));
        self::markRunningApps($deviceId, $running);

        if ($sessionState !== 'active') {
            self::closeOpenSession($deviceId, $windowsUser);
            $foregroundStored = null;
        } elseif ($foreground !== '') {
            self::trackForegroundApp($deviceId, $windowsUser, $foreground);
            $foregroundStored = $foreground;
        } else {
            $foregroundStored = self::clean((string) ($device['current_app'] ?? ''), 180);
            if ($foregroundStored === '') {
                $foregroundStored = null;
            }
        }

        Database::run(
            'UPDATE devices SET current_app = ?, windows_user = ?, session_state = ? WHERE id = ?',
            [$foregroundStored, $windowsUser !== '' ? $windowsUser : null, $sessionState, $deviceId]
        );

        return [
            'accepted' => true,
            'current_app' => $foregroundStored,
            'session_state' => $sessionState,
            'open_apps' => $running,
        ];
    }

    public static function summary(array $params, ?array $user, ?array $device, array $config): void
    {
        self::ensureSchema();

        $active = (int) (Database::get(
            'SELECT COUNT(*) AS c FROM device_app_sessions WHERE is_active = 1'
        )['c'] ?? 0);
        $titles = (int) (Database::get(
            'SELECT COUNT(*) AS c FROM device_software WHERE removed_at IS NULL'
        )['c'] ?? 0);
        $events = (int) (Database::get(
            'SELECT COUNT(*) AS c FROM device_activities WHERE occurred_at >= CURDATE()'
        )['c'] ?? 0);

        $live = Database::all(
            'SELECT s.id, s.device_id, s.app_name, s.windows_user, s.started_at,
                    TIMESTAMPDIFF(SECOND, s.started_at, NOW()) AS duration_seconds,
                    d.asset_id, d.name AS device_name, d.status, d.hostname,
                    e.name AS employee_name, dept.name AS department_name
             FROM device_app_sessions s
             INNER JOIN devices d ON d.id = s.device_id
             LEFT JOIN employees e ON e.id = d.employee_id
             LEFT JOIN departments dept ON dept.id = d.department_id
             WHERE s.is_active = 1
             ORDER BY s.started_at DESC
             LIMIT 50'
        );

        $top = Database::all(
            'SELECT app_name,
                    SUM(
                        CASE
                            WHEN is_active = 1 THEN TIMESTAMPDIFF(SECOND, started_at, NOW())
                            ELSE duration_seconds
                        END
                    ) AS duration_seconds
             FROM device_app_sessions
             WHERE started_at >= CURDATE() OR (is_active = 1)
             GROUP BY app_name
             ORDER BY duration_seconds DESC
             LIMIT 8'
        );

        $minutes = 0;
        foreach ($top as $row) {
            $minutes += (int) ($row['duration_seconds'] ?? 0);
        }

        Response::success([
            'active_sessions' => $active,
            'software_titles' => $titles,
            'events_today' => $events,
            'seconds_today' => $minutes,
            'live' => $live,
            'top_software' => $top,
        ]);
    }

    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        self::ensureSchema();
        $limit = min(200, max(1, (int) Request::query('limit', 80)));
        $eventType = trim((string) Request::query('event_type', ''));
        $search = trim((string) Request::query('search', ''));
        $deviceId = trim((string) Request::query('device_id', ''));

        $sql = 'SELECT a.*, d.asset_id, d.name AS device_name,
                       e.name AS employee_name, dept.name AS department_name
                FROM device_activities a
                INNER JOIN devices d ON d.id = a.device_id
                LEFT JOIN employees e ON e.id = d.employee_id
                LEFT JOIN departments dept ON dept.id = d.department_id
                WHERE 1=1';
        $bind = [];

        if ($eventType !== '' && $eventType !== 'all' && in_array($eventType, self::EVENT_TYPES, true)) {
            $sql .= ' AND a.event_type = ?';
            $bind[] = $eventType;
        }
        if ($deviceId !== '') {
            $sql .= ' AND (d.id = ? OR d.device_id = ? OR d.asset_id = ?)';
            array_push($bind, $deviceId, $deviceId, $deviceId);
        }
        if ($search !== '') {
            $term = '%' . $search . '%';
            $sql .= ' AND (a.summary LIKE ? OR a.app_name LIKE ? OR a.windows_user LIKE ?
                      OR d.asset_id LIKE ? OR d.name LIKE ? OR e.name LIKE ?)';
            array_push($bind, $term, $term, $term, $term, $term, $term);
        }

        $sql .= ' ORDER BY a.occurred_at DESC LIMIT ' . $limit;
        Response::success(Database::all($sql, $bind));
    }

    public static function work(array $params, ?array $user, ?array $device, array $config): void
    {
        self::ensureSchema();
        $id = (string) ($params['id'] ?? '');
        $record = Database::get(
            'SELECT id, asset_id, name, current_app, windows_user, session_state, status
             FROM devices WHERE id = ? OR device_id = ? OR asset_id = ?',
            [$id, $id, $id]
        );
        if (!$record) {
            Response::error('Device not found.', 404);
        }

        $deviceId = (int) $record['id'];
        $current = Database::get(
            'SELECT app_name, windows_user, started_at,
                    TIMESTAMPDIFF(SECOND, started_at, NOW()) AS duration_seconds, is_active
             FROM device_app_sessions
             WHERE device_id = ? AND is_active = 1
             ORDER BY id DESC LIMIT 1',
            [$deviceId]
        );

        $software = Database::all(
            'SELECT name, version, publisher, is_running, first_seen, last_seen, removed_at
             FROM device_software
             WHERE device_id = ? AND removed_at IS NULL
             ORDER BY is_running DESC, name ASC
             LIMIT 300',
            [$deviceId]
        );

        $openApps = array_values(array_filter($software, static function ($row) {
            return (int) ($row['is_running'] ?? 0) === 1;
        }));

        $usage = Database::all(
            'SELECT app_name,
                    SUM(
                        CASE
                            WHEN is_active = 1 THEN TIMESTAMPDIFF(SECOND, started_at, NOW())
                            ELSE duration_seconds
                        END
                    ) AS duration_seconds,
                    COUNT(*) AS sessions
             FROM device_app_sessions
             WHERE device_id = ? AND (started_at >= CURDATE() OR is_active = 1)
             GROUP BY app_name
             ORDER BY duration_seconds DESC
             LIMIT 20',
            [$deviceId]
        );

        $activities = Database::all(
            'SELECT event_type, app_name, windows_user, summary, occurred_at
             FROM device_activities
             WHERE device_id = ?
             ORDER BY occurred_at DESC
             LIMIT 40',
            [$deviceId]
        );

        Response::success([
            'device' => $record,
            'current' => $current ?: (
                !empty($record['current_app'])
                    ? [
                        'app_name' => $record['current_app'],
                        'windows_user' => $record['windows_user'],
                        'started_at' => null,
                        'duration_seconds' => 0,
                        'is_active' => 1,
                    ]
                    : null
            ),
            'open_apps' => $openApps,
            'software' => $software,
            'usage_today' => $usage,
            'activities' => $activities,
        ]);
    }

    private static function syncSoftware(int $deviceId, string $windowsUser, array $items): void
    {
        $incoming = [];
        foreach (array_slice($items, 0, 250) as $item) {
            if (!is_array($item)) {
                continue;
            }
            $name = self::clean((string) ($item['name'] ?? ''), 180);
            if ($name === '' || self::isNoiseSoftware($name)) {
                continue;
            }
            $incoming[$name] = [
                'version' => self::clean((string) ($item['version'] ?? ''), 80),
                'publisher' => self::clean((string) ($item['publisher'] ?? ''), 150),
            ];
        }

        if ($incoming === []) {
            return;
        }

        $existing = Database::all(
            'SELECT id, name, removed_at FROM device_software WHERE device_id = ?',
            [$deviceId]
        );
        $byName = [];
        foreach ($existing as $row) {
            $byName[$row['name']] = $row;
        }
        $hadInventory = $existing !== [];

        foreach ($incoming as $name => $meta) {
            if (isset($byName[$name])) {
                $wasRemoved = !empty($byName[$name]['removed_at']);
                Database::run(
                    'UPDATE device_software
                     SET version = ?, publisher = ?, last_seen = NOW(), removed_at = NULL
                     WHERE id = ?',
                    [$meta['version'] !== '' ? $meta['version'] : null, $meta['publisher'] !== '' ? $meta['publisher'] : null, $byName[$name]['id']]
                );
                if ($hadInventory && $wasRemoved) {
                    self::logActivity($deviceId, 'software_installed', $name, $windowsUser, "Installed {$name}");
                }
            } else {
                Database::run(
                    'INSERT INTO device_software (device_id, name, version, publisher, is_running, first_seen, last_seen)
                     VALUES (?, ?, ?, ?, 0, NOW(), NOW())',
                    [$deviceId, $name, $meta['version'] !== '' ? $meta['version'] : null, $meta['publisher'] !== '' ? $meta['publisher'] : null]
                );
                if ($hadInventory) {
                    self::logActivity($deviceId, 'software_installed', $name, $windowsUser, "Installed {$name}");
                }
            }
        }

        if ($hadInventory) {
            foreach ($byName as $name => $row) {
                if (!isset($incoming[$name]) && empty($row['removed_at'])) {
                    Database::run(
                        'UPDATE device_software SET removed_at = NOW(), is_running = 0 WHERE id = ?',
                        [$row['id']]
                    );
                    self::logActivity($deviceId, 'software_removed', $name, $windowsUser, "Removed {$name}");
                }
            }
        } else {
            self::logActivity(
                $deviceId,
                'inventory_sync',
                null,
                $windowsUser,
                'Software inventory recorded (' . count($incoming) . ' applications)'
            );
        }
    }

    private static function markRunningApps(int $deviceId, array $running): void
    {
        Database::run('UPDATE device_software SET is_running = 0 WHERE device_id = ?', [$deviceId]);
        if ($running === []) {
            return;
        }

        $rows = Database::all(
            'SELECT id, name FROM device_software WHERE device_id = ? AND removed_at IS NULL',
            [$deviceId]
        );

        foreach ($running as $app) {
            $matched = false;
            foreach ($rows as $row) {
                if (self::namesMatch($app, $row['name'])) {
                    Database::run('UPDATE device_software SET is_running = 1, last_seen = NOW() WHERE id = ?', [$row['id']]);
                    $matched = true;
                    break;
                }
            }
            if (!$matched) {
                Database::run(
                    'INSERT INTO device_software (device_id, name, version, publisher, is_running, first_seen, last_seen)
                     VALUES (?, ?, NULL, ?, 1, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE is_running = 1, last_seen = NOW(), removed_at = NULL',
                    [$deviceId, $app, 'Open application']
                );
            }
        }
    }

    private static function trackForegroundApp(int $deviceId, string $windowsUser, string $app): void
    {
        $open = Database::get(
            'SELECT * FROM device_app_sessions WHERE device_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1',
            [$deviceId]
        );

        if ($open && strcasecmp((string) $open['app_name'], $app) === 0) {
            Database::run(
                'UPDATE device_app_sessions
                 SET duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
                     windows_user = COALESCE(NULLIF(?, \'\'), windows_user)
                 WHERE id = ?',
                [$windowsUser, $open['id']]
            );
            return;
        }

        if ($open) {
            self::closeOpenSession($deviceId, $windowsUser);
        }

        Database::run(
            'INSERT INTO device_app_sessions (device_id, app_name, windows_user, started_at, duration_seconds, is_active)
             VALUES (?, ?, ?, NOW(), 0, 1)',
            [$deviceId, $app, $windowsUser !== '' ? $windowsUser : null]
        );
        $who = $windowsUser !== '' ? $windowsUser : 'User';
        self::logActivity($deviceId, 'app_focus', $app, $windowsUser, "{$who} started using {$app}");
    }

    private static function closeOpenSession(int $deviceId, string $windowsUser): void
    {
        $open = Database::get(
            'SELECT * FROM device_app_sessions WHERE device_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1',
            [$deviceId]
        );
        if (!$open) {
            return;
        }

        Database::run(
            'UPDATE device_app_sessions
             SET is_active = 0, ended_at = NOW(),
                 duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
             WHERE id = ?',
            [$open['id']]
        );
        $who = $windowsUser !== '' ? $windowsUser : ((string) ($open['windows_user'] ?? 'User'));
        self::logActivity(
            $deviceId,
            'app_close',
            (string) $open['app_name'],
            $who,
            "{$who} stopped using {$open['app_name']}"
        );
    }

    private static function recordSessionTransition(int $deviceId, string $windowsUser, string $previous, string $next): void
    {
        if ($previous === $next) {
            return;
        }
        $who = $windowsUser !== '' ? $windowsUser : 'User';
        if ($next === 'locked' && $previous !== 'locked') {
            self::logActivity($deviceId, 'screen_lock', null, $windowsUser, "{$who} locked the workstation");
        } elseif ($next === 'active' && $previous === 'locked') {
            self::logActivity($deviceId, 'screen_unlock', null, $windowsUser, "{$who} unlocked the workstation");
        } elseif ($next === 'logged_off') {
            self::logActivity($deviceId, 'session_end', null, $windowsUser, "{$who} signed out");
        } elseif ($next === 'active' && ($previous === '' || $previous === 'logged_off')) {
            self::logActivity($deviceId, 'session_start', null, $windowsUser, "{$who} signed in");
        }
    }

    private static function logActivity(int $deviceId, string $type, ?string $app, string $windowsUser, string $summary): void
    {
        if (!in_array($type, self::EVENT_TYPES, true)) {
            return;
        }
        $summary = self::clean($summary, 255);
        if ($summary === '') {
            return;
        }
        Database::run(
            'INSERT INTO device_activities (device_id, event_type, app_name, windows_user, summary, occurred_at)
             VALUES (?, ?, ?, ?, ?, NOW())',
            [
                $deviceId,
                $type,
                $app !== null && $app !== '' ? self::clean($app, 180) : null,
                $windowsUser !== '' ? self::clean($windowsUser, 80) : null,
                $summary,
            ]
        );
    }

    private static function namesMatch(string $process, string $software): bool
    {
        $left = strtolower(trim($process));
        $right = strtolower(trim($software));
        if ($left === '' || $right === '') {
            return false;
        }
        if ($left === $right) {
            return true;
        }
        if (strlen($left) >= 5 && (str_contains($right, $left) || str_contains($left, $right))) {
            return true;
        }
        return false;
    }

    private static function friendlyApp(string $raw): string
    {
        $name = self::clean($raw, 180);
        if ($name === '') {
            return '';
        }
        $map = [
            'chrome' => 'Google Chrome',
            'google chrome' => 'Google Chrome',
            'msedge' => 'Microsoft Edge',
            'microsoft edge' => 'Microsoft Edge',
            'firefox' => 'Mozilla Firefox',
            'excel' => 'Microsoft Excel',
            'microsoft excel' => 'Microsoft Excel',
            'winword' => 'Microsoft Word',
            'microsoft word' => 'Microsoft Word',
            'outlook' => 'Microsoft Outlook',
            'microsoft outlook' => 'Microsoft Outlook',
            'powerpnt' => 'Microsoft PowerPoint',
            'microsoft powerpoint' => 'Microsoft PowerPoint',
            'onenote' => 'Microsoft OneNote',
            'teams' => 'Microsoft Teams',
            'microsoft teams' => 'Microsoft Teams',
            'code' => 'Visual Studio Code',
            'visual studio code' => 'Visual Studio Code',
            'slack' => 'Slack',
            'explorer' => 'File Explorer',
            'file explorer' => 'File Explorer',
            'notion' => 'Notion',
            'spotify' => 'Spotify',
            'zoom' => 'Zoom',
            'acrobat' => 'Adobe Acrobat',
            'windowsterminal' => 'Windows Terminal',
            'windows terminal' => 'Windows Terminal',
            'finder' => 'Finder',
            'figma' => 'Figma',
        ];
        $key = strtolower($name);
        return $map[$key] ?? $name;
    }

    private static function isNoiseSoftware(string $name): bool
    {
        return (bool) preg_match('/update for|hotfix|security update|\bkb\d{5,}\b|definition update/i', $name);
    }

    private static function clean(string $value, int $max): string
    {
        $value = trim((string) preg_replace('/[\x00-\x1F\x7F]/', '', $value));
        if (strlen($value) > $max) {
            $value = substr($value, 0, $max);
        }
        return $value;
    }
}
