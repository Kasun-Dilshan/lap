<?php

declare(strict_types=1);

/**
 * Laptop owner sign-in.
 * Saves the laptop that signed in and keeps hardware, presence, and work activity on that device.
 * Does not store keystrokes, screenshots, passwords, or window titles.
 */
class OwnerController
{
    public static function login(array $params, ?array $user, ?array $device, array $config): void
    {
        self::ensureRole();
        self::ensureDemoOwner();

        $body = Request::body();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $laptop = is_array($body['laptop'] ?? null) ? $body['laptop'] : [];

        if ($email === '' || $password === '') {
            Response::error('Email and password are required.');
        }

        $record = Database::get('SELECT * FROM users WHERE email = ?', [$email]);
        if (!$record || !self::passwordMatches($password, (string) $record['password_hash'])) {
            Response::error('Invalid email or password.', 401);
        }

        if (($record['status'] ?? '') !== 'active') {
            Response::error("Account is {$record['status']}. Please contact system administrator.", 403);
        }

        $employee = Database::get(
            'SELECT e.*, d.name AS department_name
             FROM employees e
             LEFT JOIN departments d ON d.id = e.department_id
             WHERE e.email = ?',
            [$email]
        );
        if (!$employee || ($employee['status'] ?? '') !== 'active') {
            Response::error('This login is not linked to an active laptop owner. Ask IT to add the employee first.', 403);
        }

        $saved = self::saveLaptop($employee, $laptop, [
            'id' => (int) $record['id'],
            'email' => $record['email'],
            'role' => $record['role'],
        ]);

        Database::run('UPDATE users SET last_login = NOW() WHERE id = ?', [(int) $record['id']]);

        $payload = [
            'id' => (int) $record['id'],
            'name' => $record['name'],
            'email' => $record['email'],
            'role' => $record['role'],
        ];
        $token = Jwt::encode($payload, $config['jwt_secret'], $config['jwt_expires_in']);

        Audit::log($payload, 'OWNER_LOGIN', 'DEVICE', $saved['asset_id'], [
            'email' => $record['email'],
            'employee_id' => $employee['employee_id'],
            'device_id' => $saved['device_id'],
            'hostname' => $saved['hostname'],
        ]);

        $agentPayload = self::buildAgentInstallPayload($saved, $config);

        Response::success([
            'token' => $token,
            'user' => [
                'id' => (int) $record['id'],
                'name' => $record['name'],
                'email' => $record['email'],
                'role' => $record['role'],
                'employee_id' => (int) $employee['id'],
                'employee_code' => $employee['employee_id'],
                'last_login' => $record['last_login'],
            ],
            'device' => $saved,
            'agent_install' => $agentPayload,
        ], 'Laptop saved. Install the tracking agent on this machine to run at every sign-in.');
    }

    /**
     * Installer signup: create laptop-owner user + employee (or sign in if they already exist),
     * attach this laptop, and return the agent tokens so the Windows setup can finish.
     * Admins see the new person under Employees / Users and the laptop under Devices.
     */
    public static function installRegister(array $params, ?array $user, ?array $device, array $config): void
    {
        self::ensureRole();

        $body = Request::body();
        $username = trim((string) ($body['username'] ?? $body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $name = trim((string) ($body['name'] ?? ''));
        $laptop = is_array($body['laptop'] ?? null) ? $body['laptop'] : [];

        if ($username === '' || $password === '') {
            Response::error('Username and password are required.');
        }
        if (strlen($password) < 6) {
            Response::error('Password must be at least 6 characters.');
        }

        $email = str_contains($username, '@')
            ? strtolower($username)
            : strtolower(preg_replace('/[^a-zA-Z0-9._+-]+/', '.', $username) ?: 'user') . '@company.local';

        if ($name === '') {
            $name = strstr($email, '@', true) ?: $username;
            $name = ucwords(str_replace(['.', '_', '-'], ' ', $name));
        }

        $created = false;
        $record = Database::get('SELECT * FROM users WHERE email = ?', [$email]);

        if ($record) {
            if (!self::passwordMatches($password, (string) $record['password_hash'])) {
                Response::error('This username already exists. Enter the correct password, or choose a different username.', 401);
            }
            if (($record['status'] ?? '') !== 'active') {
                Response::error("Account is {$record['status']}. Please contact system administrator.", 403);
            }
            if (($record['role'] ?? '') !== 'laptop_owner') {
                Response::error('This login is an admin account. Use a laptop owner username for install.', 403);
            }
        } else {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $userResult = Database::run(
                "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'laptop_owner', 'active')",
                [$name, $email, $hash]
            );
            $record = Database::get('SELECT * FROM users WHERE id = ?', [(int) $userResult['insertId']]);
            if (!$record) {
                Response::error('Could not create user account.', 500);
            }
            $created = true;
        }

        $employee = Database::get('SELECT * FROM employees WHERE email = ?', [$email]);
        if (!$employee) {
            $codeBase = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', strstr($email, '@', true) ?: 'USER') ?: 'USER', 0, 8));
            $employeeCode = 'OWN-' . $codeBase;
            $clash = Database::get('SELECT id FROM employees WHERE employee_id = ?', [$employeeCode]);
            if ($clash) {
                $employeeCode = 'OWN-' . $codeBase . '-' . substr(bin2hex(random_bytes(2)), 0, 4);
            }

            $empResult = Database::run(
                "INSERT INTO employees (employee_id, name, email, phone, department_id, branch, position, status)
                 VALUES (?, ?, ?, NULL, NULL, 'Headquarters', 'Laptop Owner', 'active')",
                [$employeeCode, $name, $email]
            );
            $employee = Database::get('SELECT * FROM employees WHERE id = ?', [(int) $empResult['insertId']]);
            if (!$employee) {
                Response::error('Could not create employee profile.', 500);
            }
            $created = true;
        } elseif (($employee['status'] ?? '') !== 'active') {
            Response::error('This employee profile is inactive. Contact an administrator.', 403);
        }

        if (empty($laptop['device_id'])) {
            $laptop['device_id'] = 'HW-' . strtoupper(substr(hash('sha256', $email . '|' . gethostname()), 0, 16));
        }
        if (empty($laptop['hostname'])) {
            $laptop['hostname'] = gethostname() ?: 'LAPTOP';
        }
        if (empty($laptop['os'])) {
            $laptop['os'] = 'Windows';
        }
        if (empty($laptop['name'])) {
            $laptop['name'] = $name . "'s Laptop";
        }

        $actor = [
            'id' => (int) $record['id'],
            'email' => $record['email'],
            'role' => $record['role'],
        ];
        try {
            $saved = self::saveLaptop($employee, $laptop, $actor);
        } catch (Throwable $e) {
            error_log('[installRegister] saveLaptop failed: ' . $e->getMessage());
            Response::error('Could not register this laptop on the server. ' . $e->getMessage(), 500);
        }

        $deviceToken = (string) ($saved['device_token'] ?? '');
        if ($deviceToken === '') {
            $deviceToken = 'dev_tok_' . bin2hex(random_bytes(16));
        }

        try {
            Database::run(
                'UPDATE devices SET
                    device_token = ?,
                    agent_installed_at = NOW(),
                    agent_allowed = 1,
                    last_seen = NOW(),
                    updated_at = NOW()
                 WHERE id = ?',
                [$deviceToken, (int) $saved['id']]
            );
        } catch (Throwable $e) {
            // Older databases may not have agent_* columns yet.
            Database::run(
                'UPDATE devices SET device_token = ?, last_seen = NOW(), updated_at = NOW() WHERE id = ?',
                [$deviceToken, (int) $saved['id']]
            );
        }
        $saved = self::loadDevice((int) $saved['id']) ?: $saved;

        Database::run('UPDATE users SET last_login = NOW() WHERE id = ?', [(int) $record['id']]);

        $payload = [
            'id' => (int) $record['id'],
            'name' => $record['name'],
            'email' => $record['email'],
            'role' => $record['role'],
        ];
        $token = Jwt::encode($payload, $config['jwt_secret'], $config['jwt_expires_in']);
        $agentPayload = self::buildAgentInstallPayload($saved, $config);

        Audit::log($payload, $created ? 'OWNER_INSTALL_CREATED' : 'OWNER_INSTALL_LOGIN', 'DEVICE', $saved['asset_id'], [
            'email' => $email,
            'employee_id' => $employee['employee_id'],
            'device_id' => $saved['device_id'],
            'created' => $created,
        ]);

        if ($created) {
            Database::run(
                "INSERT INTO notifications (title, message, type, link)
                 VALUES (?, ?, 'info', ?)",
                [
                    'New laptop owner installed',
                    "{$name} ({$email}) installed the agent on {$saved['asset_id']}.",
                    '/employees',
                ]
            );
        }

        Response::success([
            'token' => $token,
            'created' => $created,
            'user' => [
                'id' => (int) $record['id'],
                'name' => $record['name'],
                'email' => $record['email'],
                'role' => $record['role'],
                'employee_id' => (int) $employee['id'],
                'employee_code' => $employee['employee_id'],
            ],
            'device' => [
                'id' => (int) $saved['id'],
                'device_id' => $saved['device_id'],
                'asset_id' => $saved['asset_id'],
                'hostname' => $saved['hostname'],
                'name' => $saved['name'],
            ],
            'agent_install' => $agentPayload,
        ], $created
            ? 'Account created. This laptop is registered and ready for the agent.'
            : 'Signed in. This laptop is registered and ready for the agent.');
    }

    /**
     * Laptop owner: register the background agent on this machine (persists token + auto-start).
     * Does not change fleet online/offline status — only agent heartbeats update that.
     */
    public static function agentInstall(array $params, ?array $user, ?array $device, array $config): void
    {
        if (!$user) {
            Response::error('Access denied.', 401);
        }

        $body = Request::body();
        $owned = self::requireOwnedDevice($user, (string) ($body['device_id'] ?? ''), false);
        $deviceRowId = (int) $owned['id'];

        if (array_key_exists('agent_allowed', $owned) && (int) $owned['agent_allowed'] !== 1) {
            Response::error('The tracking agent was removed by IT. Contact an administrator to allow installation again.', 403);
        }

        $deviceToken = (string) ($owned['device_token'] ?? '');
        if ($deviceToken === '') {
            $deviceToken = 'dev_tok_' . bin2hex(random_bytes(16));
        }

        $deviceKey = self::clip($body['device_id'] ?? null, 64) ?? (string) $owned['device_id'];
        $hostname = self::clip($body['hostname'] ?? null, 120);
        $publicIp = self::clientIp();

        Database::run(
            'UPDATE devices SET
                device_id = ?,
                device_token = ?,
                agent_installed_at = NOW(),
                agent_allowed = 1,
                hostname = COALESCE(?, hostname),
                manufacturer = COALESCE(?, manufacturer),
                model = COALESCE(?, model),
                serial_number = COALESCE(?, serial_number),
                os = COALESCE(?, os),
                os_version = COALESCE(?, os_version),
                mac_address = COALESCE(?, mac_address),
                local_ip = COALESCE(?, local_ip),
                public_ip = ?,
                last_seen = NOW(),
                updated_at = NOW()
             WHERE id = ?',
            [
                $deviceKey,
                $deviceToken,
                $hostname,
                self::clip($body['manufacturer'] ?? null, 80),
                self::clip($body['model'] ?? null, 120),
                self::clip($body['serial_number'] ?? null, 100),
                self::clip($body['os'] ?? null, 50),
                self::clip($body['os_version'] ?? null, 100),
                self::clip($body['mac_address'] ?? null, 50),
                self::clip($body['local_ip'] ?? null, 45),
                $publicIp,
                $deviceRowId,
            ]
        );

        $fresh = self::loadDevice($deviceRowId) ?: $owned;
        $payload = self::buildAgentInstallPayload($fresh, $config);

        Audit::log($user, 'AGENT_INSTALLED', 'DEVICE', $fresh['asset_id'], [
            'device_id' => $fresh['device_id'],
            'hostname' => $fresh['hostname'],
        ]);

        Response::success($payload, 'Tracking agent registered on this laptop.');
    }

    /**
     * Serve agent.js so owner bootstrap can download it from the company server.
     */
    public static function agentScript(array $params, ?array $user, ?array $device, array $config): void
    {
        $candidates = [
            dirname(__DIR__) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'agent' . DIRECTORY_SEPARATOR . 'agent.js',
            dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'agent' . DIRECTORY_SEPARATOR . 'agent.js',
            dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'agent' . DIRECTORY_SEPARATOR . 'agent.js',
        ];
        $path = null;
        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                $path = $candidate;
                break;
            }
        }
        if ($path === null) {
            Response::error('Agent script is not available on this server.', 404);
        }

        $body = file_get_contents($path);
        if ($body === false) {
            Response::error('Could not read agent script.', 500);
        }

        Response::text($body, 200, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Download a Windows setup script that installs Node.js 18+ (if missing)
     * and the tracking agent after laptop-owner sign-in.
     */
    public static function bootstrap(array $params, ?array $user, ?array $device, array $config): void
    {
        if (!$user) {
            Response::error('Access denied.', 401);
        }

        $token = Auth::bearerToken() ?? '';
        if ($token === '') {
            Response::error('Access denied.', 401);
        }

        $owned = self::requireOwnedDevice($user, (string) Request::query('device_id', ''), false);
        $payload = self::buildAgentInstallPayload($owned, $config);
        $serverUrl = (string) $payload['server_url'];
        $deviceId = (string) ($owned['device_id'] ?? '');

        $ps = self::buildWindowsBootstrapPs($serverUrl, $token, $deviceId);
        if (function_exists('mb_convert_encoding')) {
            $encoded = base64_encode(mb_convert_encoding($ps, 'UTF-16LE', 'UTF-8'));
        } else {
            $encoded = base64_encode(iconv('UTF-8', 'UTF-16LE', $ps));
        }

        $cmd = "@echo off\r\n"
            . "title CLTMS Laptop Setup\r\n"
            . "echo.\r\n"
            . "echo  Company Laptop Tracking - setup\r\n"
            . "echo  Installing Node.js 18+ if needed, then the tracking agent...\r\n"
            . "echo.\r\n"
            . "powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand {$encoded}\r\n"
            . "if errorlevel 1 (\r\n"
            . "  echo Setup failed. Ask IT for help.\r\n"
            . "  pause\r\n"
            . "  exit /b 1\r\n"
            . ")\r\n"
            . "echo.\r\n"
            . "echo Setup finished. You can close this window.\r\n"
            . "timeout /t 5 >nul\r\n";

        Response::text($cmd, 200, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="CLTMS-Setup.cmd"',
            'Cache-Control' => 'no-store',
        ]);
    }

    public static function laptop(array $params, ?array $user, ?array $device, array $config): void
    {
        $owned = self::requireOwnedDevice($user, (string) Request::query('device_id', ''));
        Response::success($owned);
    }

    public static function track(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $owned = self::requireOwnedDevice($user, (string) ($body['device_id'] ?? ''));
        $deviceId = (int) $owned['id'];

        $cpu = self::nullableNumber($body['cpu_usage'] ?? null);
        $ram = self::nullableNumber($body['ram_usage'] ?? null);
        $disk = self::nullableNumber($body['disk_usage'] ?? null);
        $battery = self::nullableInt($body['battery_percent'] ?? null);
        $batteryStatus = self::clip($body['battery_status'] ?? null, 30);
        $localIp = self::clip($body['local_ip'] ?? null, 45);
        $mac = self::clip($body['mac_address'] ?? null, 50);
        $hostname = self::clip($body['hostname'] ?? null, 120);
        $publicIp = self::clientIp();
        $event = (string) ($body['event'] ?? 'heartbeat');

        Database::run(
            "UPDATE devices SET
                hostname = COALESCE(?, hostname),
                cpu_usage = COALESCE(?, cpu_usage),
                ram_usage = COALESCE(?, ram_usage),
                disk_usage = COALESCE(?, disk_usage),
                battery_percent = COALESCE(?, battery_percent),
                battery_status = COALESCE(?, battery_status),
                local_ip = COALESCE(?, local_ip),
                mac_address = COALESCE(?, mac_address),
                public_ip = ?,
                last_seen = NOW()
             WHERE id = ?",
            [$hostname, $cpu, $ram, $disk, $battery, $batteryStatus, $localIp, $mac, $publicIp, $deviceId]
        );

        if ($event !== 'session_end') {
            Database::run(
                "INSERT INTO device_heartbeats (
                    device_id, cpu_usage, ram_usage, disk_usage,
                    battery_percent, battery_status, public_ip, local_ip, status
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online')",
                [
                    $deviceId,
                    $cpu ?? (float) ($owned['cpu_usage'] ?? 0),
                    $ram ?? (float) ($owned['ram_usage'] ?? 0),
                    $disk ?? (float) ($owned['disk_usage'] ?? 0),
                    $battery ?? (int) ($owned['battery_percent'] ?? 100),
                    $batteryStatus ?? (string) ($owned['battery_status'] ?? 'Unknown'),
                    $publicIp,
                    $localIp ?? (string) ($owned['local_ip'] ?? ''),
                ]
            );
        }

        $activity = ['current_app' => null, 'open_apps' => [], 'session_state' => $event === 'session_end' ? 'logged_off' : 'active'];
        if (class_exists('ActivityController')) {
            $fresh = Database::get('SELECT * FROM devices WHERE id = ?', [$deviceId]) ?: $owned;
            $activity = ActivityController::applyReport($fresh, $body);
        }

        $currentStatus = (string) (Database::get('SELECT status FROM devices WHERE id = ?', [$deviceId])['status'] ?? $owned['status']);

        Response::success([
            'device_id' => $owned['device_id'],
            'asset_id' => $owned['asset_id'],
            'status' => $currentStatus,
            'current_app' => $activity['current_app'] ?? null,
            'open_apps' => $activity['open_apps'] ?? [],
            'session_state' => $activity['session_state'] ?? null,
        ], 'Laptop tracking updated.');
    }

    private static function saveLaptop(array $employee, array $laptop, array $actor): array
    {
        $deviceKey = self::clip($laptop['device_id'] ?? null, 64);
        if ($deviceKey === null) {
            Response::error('This laptop could not be identified. Sign in again from the laptop you want tracked.');
        }

        $serialRaw = self::clip($laptop['serial_number'] ?? null, 100);
        $isBrowserFingerprint = $serialRaw === null
            || $serialRaw === $deviceKey
            || str_starts_with($serialRaw, 'WEB-');
        $serial = $isBrowserFingerprint ? null : $serialRaw;
        $hostname = self::clip($laptop['hostname'] ?? null, 120) ?? 'LAPTOP';
        $os = self::clip($laptop['os'] ?? null, 50) ?? 'Unknown';
        $publicIp = self::clientIp();
        $ownerName = (string) $employee['name'];
        $deviceName = self::clip($laptop['name'] ?? null, 120);

        $existing = self::resolveOwnerDevice((int) $employee['id'], $ownerName, $deviceKey, $serial, $hostname);

        if (!$existing) {
            $assetId = DeviceController::nextAssetId();
            $deviceToken = 'dev_tok_' . bin2hex(random_bytes(16));
            $finalName = $deviceName ?: ($ownerName . "'s Laptop");
            $finalSerial = $serial ?? $deviceKey;

            $result = Database::run(
                'INSERT INTO devices (
                    device_id, asset_id, name, hostname, manufacturer, model, serial_number,
                    os, os_version, architecture, cpu_model, ram_total_gb, storage_total_gb,
                    mac_address, local_ip, public_ip, battery_percent, battery_status,
                    cpu_usage, ram_usage, disk_usage,
                    employee_id, department_id, branch, assigned_date,
                    device_token, first_seen, last_seen
                 ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, NOW(),
                    ?, NOW(), NOW()
                 )',
                [
                    $deviceKey,
                    $assetId,
                    $finalName,
                    $hostname,
                    self::clip($laptop['manufacturer'] ?? null, 80) ?? 'Standard OEM',
                    self::clip($laptop['model'] ?? null, 120) ?? 'Corporate Laptop',
                    $finalSerial,
                    $os,
                    self::clip($laptop['os_version'] ?? null, 100) ?? '',
                    self::clip($laptop['architecture'] ?? null, 30) ?? 'x64',
                    self::clip($laptop['cpu_model'] ?? null, 150) ?? '',
                    self::nullableNumber($laptop['ram_total_gb'] ?? null) ?? 0,
                    self::nullableNumber($laptop['storage_total_gb'] ?? null) ?? 0,
                    self::clip($laptop['mac_address'] ?? null, 50) ?? '',
                    self::clip($laptop['local_ip'] ?? null, 45) ?? '',
                    $publicIp,
                    self::nullableInt($laptop['battery_percent'] ?? null) ?? 100,
                    self::clip($laptop['battery_status'] ?? null, 30) ?? 'Unknown',
                    self::nullableNumber($laptop['cpu_usage'] ?? null) ?? 0,
                    self::nullableNumber($laptop['ram_usage'] ?? null) ?? 0,
                    self::nullableNumber($laptop['disk_usage'] ?? null) ?? 0,
                    (int) $employee['id'],
                    $employee['department_id'] ?? null,
                    self::clip($employee['branch'] ?? null, 100) ?? 'Headquarters',
                    $deviceToken,
                ]
            );
            // status / asset_status stay at DB defaults (offline / available) until the agent heartbeats.
            $deviceRowId = (int) $result['insertId'];
            $assetId = $assetId;
        } else {
            $assetId = (string) $existing['asset_id'];
            $deviceRowId = (int) $existing['id'];

            // Keep inventory identity and fleet status; only refresh live telemetry fields.
            Database::run(
                'UPDATE devices SET
                    device_id = ?,
                    hostname = COALESCE(?, hostname),
                    manufacturer = CASE
                        WHEN ? IS NOT NULL AND (manufacturer IS NULL OR manufacturer = \'\' OR manufacturer = \'PC\' OR manufacturer = \'Standard OEM\')
                        THEN ? ELSE manufacturer END,
                    model = CASE
                        WHEN ? IS NOT NULL AND (model IS NULL OR model = \'\' OR model = \'Corporate Laptop\')
                        THEN ? ELSE model END,
                    serial_number = CASE WHEN ? IS NOT NULL THEN ? ELSE serial_number END,
                    os = COALESCE(?, os),
                    os_version = COALESCE(?, os_version),
                    architecture = COALESCE(?, architecture),
                    cpu_model = COALESCE(?, cpu_model),
                    ram_total_gb = COALESCE(?, ram_total_gb),
                    storage_total_gb = COALESCE(?, storage_total_gb),
                    mac_address = COALESCE(?, mac_address),
                    local_ip = COALESCE(?, local_ip),
                    public_ip = ?,
                    battery_percent = COALESCE(?, battery_percent),
                    battery_status = COALESCE(?, battery_status),
                    cpu_usage = COALESCE(?, cpu_usage),
                    ram_usage = COALESCE(?, ram_usage),
                    disk_usage = COALESCE(?, disk_usage),
                    employee_id = ?,
                    department_id = COALESCE(?, department_id),
                    branch = COALESCE(?, branch),
                    last_seen = NOW(),
                    updated_at = NOW()
                 WHERE id = ?',
                [
                    $deviceKey,
                    $hostname,
                    self::clip($laptop['manufacturer'] ?? null, 80),
                    self::clip($laptop['manufacturer'] ?? null, 80),
                    self::clip($laptop['model'] ?? null, 120),
                    self::clip($laptop['model'] ?? null, 120),
                    $serial,
                    $serial,
                    $os,
                    self::clip($laptop['os_version'] ?? null, 100),
                    self::clip($laptop['architecture'] ?? null, 30),
                    self::clip($laptop['cpu_model'] ?? null, 150),
                    self::nullableNumber($laptop['ram_total_gb'] ?? null),
                    self::nullableNumber($laptop['storage_total_gb'] ?? null),
                    self::clip($laptop['mac_address'] ?? null, 50),
                    self::clip($laptop['local_ip'] ?? null, 45),
                    $publicIp,
                    self::nullableInt($laptop['battery_percent'] ?? null),
                    self::clip($laptop['battery_status'] ?? null, 30),
                    self::nullableNumber($laptop['cpu_usage'] ?? null),
                    self::nullableNumber($laptop['ram_usage'] ?? null),
                    self::nullableNumber($laptop['disk_usage'] ?? null),
                    (int) $employee['id'],
                    $employee['department_id'] ?? null,
                    self::clip($employee['branch'] ?? null, 100) ?? ($existing['branch'] ?? 'Headquarters'),
                    $deviceRowId,
                ]
            );

            if ((int) ($existing['employee_id'] ?? 0) !== (int) $employee['id'] || empty($existing['assigned_date'])) {
                Database::run('UPDATE devices SET assigned_date = NOW() WHERE id = ?', [$deviceRowId]);
            }
        }

        self::assignOwner($deviceRowId, $employee, (int) $actor['id']);
        self::storeLocation($deviceRowId, $publicIp);
        self::storeHeartbeat($deviceRowId, $laptop, $publicIp);

        if (class_exists('ActivityController')) {
            try {
                $fresh = Database::get('SELECT * FROM devices WHERE id = ?', [$deviceRowId]);
                $workBody = $laptop;
                $workBody['event'] = 'session_start';
                $workBody['session_state'] = 'active';
                if (empty($workBody['windows_user'])) {
                    $workBody['windows_user'] = strstr((string) $employee['email'], '@', true) ?: $employee['email'];
                }
                if (empty($workBody['foreground_app'])) {
                    $workBody['foreground_app'] = 'Company Portal';
                }
                if (empty($workBody['running_apps']) || !is_array($workBody['running_apps'])) {
                    $workBody['running_apps'] = array_values(array_filter([
                        $workBody['foreground_app'] ?? null,
                    ]));
                }
                if (!empty($laptop['software']) && is_array($laptop['software'])) {
                    $workBody['software'] = $laptop['software'];
                    $workBody['full_inventory'] = true;
                }
                ActivityController::applyReport($fresh ?: ['id' => $deviceRowId], $workBody);
            } catch (Throwable $e) {
                error_log('Owner login activity ingest skipped: ' . $e->getMessage());
            }
        }

        Database::run(
            "INSERT INTO notifications (title, message, type, link)
             VALUES (?, ?, 'success', ?)",
            [
                'Laptop owner signed in',
                "{$ownerName} signed in on {$assetId} ({$hostname}). Agent install will run on this laptop.",
                "/devices/{$deviceRowId}",
            ]
        );

        $saved = self::loadDevice($deviceRowId);
        if (!$saved) {
            Response::error('Laptop was saved but could not be reloaded.', 500);
        }

        return $saved;
    }

    /**
     * Find the inventory laptop this owner should light up for admins.
     * Prefer assigned inventory rows over new browser fingerprints.
     */
    private static function resolveOwnerDevice(
        int $employeeId,
        string $ownerName,
        string $deviceKey,
        ?string $serial,
        string $hostname
    ): ?array {
        $assigned = Database::get(
            "SELECT * FROM devices
             WHERE employee_id = ? AND status != 'deactivated'
             ORDER BY (CASE WHEN status = 'online' THEN 0 ELSE 1 END), last_seen DESC, id DESC
             LIMIT 1",
            [$employeeId]
        );
        if ($assigned) {
            return $assigned;
        }

        $byFingerprint = Database::get(
            'SELECT * FROM devices WHERE device_id = ? LIMIT 1',
            [$deviceKey]
        );
        if ($byFingerprint) {
            return $byFingerprint;
        }

        if ($serial !== null) {
            $bySerial = Database::get(
                'SELECT * FROM devices WHERE serial_number = ? LIMIT 1',
                [$serial]
            );
            if ($bySerial) {
                return $bySerial;
            }
        }

        // Match inventory laptops named after the employee (e.g. "Umesh") even if still Unassigned.
        $name = trim($ownerName);
        if ($name !== '') {
            $byName = Database::get(
                "SELECT * FROM devices
                 WHERE status != 'deactivated'
                   AND (
                        LOWER(name) = LOWER(?)
                        OR LOWER(name) LIKE LOWER(?)
                        OR LOWER(hostname) = LOWER(?)
                   )
                 ORDER BY (CASE WHEN employee_id IS NULL THEN 0 ELSE 1 END), last_seen DESC, id DESC
                 LIMIT 1",
                [$name, '%' . $name . '%', $hostname]
            );
            if ($byName) {
                return $byName;
            }
        }

        if ($hostname !== '' && $hostname !== 'LAPTOP') {
            $byHost = Database::get(
                "SELECT * FROM devices WHERE status != 'deactivated' AND LOWER(hostname) = LOWER(?) LIMIT 1",
                [$hostname]
            );
            if ($byHost) {
                return $byHost;
            }
        }

        return null;
    }

    private static function assignOwner(int $deviceRowId, array $employee, int $userId): void
    {
        $active = Database::get(
            "SELECT id, employee_id FROM device_assignments WHERE device_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
            [$deviceRowId]
        );
        if ($active && (int) ($active['employee_id'] ?? 0) === (int) $employee['id']) {
            return;
        }

        Database::run(
            "UPDATE device_assignments SET status = 'transferred', unassigned_date = NOW()
             WHERE device_id = ? AND status = 'active'",
            [$deviceRowId]
        );
        Database::run(
            "INSERT INTO device_assignments (device_id, employee_id, department_id, assigned_by, notes, status)
             VALUES (?, ?, ?, ?, 'Assigned when the laptop owner signed in', 'active')",
            [$deviceRowId, (int) $employee['id'], $employee['department_id'] ?? null, $userId]
        );
    }

    private static function storeLocation(int $deviceRowId, string $publicIp): void
    {
        $loc = DeviceController::locateIp($publicIp);
        Database::run(
            'INSERT INTO device_locations (device_id, public_ip, city, region, country, country_code, latitude, longitude, isp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $deviceRowId,
                $publicIp !== '' ? $publicIp : '127.0.0.1',
                $loc['city'],
                $loc['region'],
                $loc['country'],
                $loc['country_code'],
                $loc['latitude'],
                $loc['longitude'],
                $loc['isp'],
            ]
        );
    }

    private static function storeHeartbeat(int $deviceRowId, array $laptop, string $publicIp): void
    {
        Database::run(
            "INSERT INTO device_heartbeats (
                device_id, cpu_usage, ram_usage, disk_usage,
                battery_percent, battery_status, public_ip, local_ip, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online')",
            [
                $deviceRowId,
                self::nullableNumber($laptop['cpu_usage'] ?? null) ?? 0,
                self::nullableNumber($laptop['ram_usage'] ?? null) ?? 0,
                self::nullableNumber($laptop['disk_usage'] ?? null) ?? 0,
                self::nullableInt($laptop['battery_percent'] ?? null) ?? 100,
                self::clip($laptop['battery_status'] ?? null, 30) ?? 'Unknown',
                $publicIp,
                self::clip($laptop['local_ip'] ?? null, 45),
            ]
        );
    }

    private static function requireOwnedDevice(?array $user, string $deviceKey, bool $refreshLastSeen = true): array
    {
        if (!$user) {
            Response::error('Access denied.', 401);
        }

        $employee = Database::get('SELECT * FROM employees WHERE email = ?', [$user['email']]);
        if (!$employee) {
            Response::error('No laptop owner profile is linked to this account.', 403);
        }

        $deviceKey = trim($deviceKey);
        $row = null;

        if ($deviceKey !== '') {
            $row = Database::get(
                'SELECT * FROM devices WHERE device_id = ? OR asset_id = ? ORDER BY last_seen DESC LIMIT 1',
                [$deviceKey, $deviceKey]
            );
            if ($row && !empty($row['employee_id']) && (int) $row['employee_id'] !== (int) $employee['id']) {
                $row = null;
            }
        }

        if (!$row) {
            $row = Database::get(
                "SELECT * FROM devices
                 WHERE employee_id = ? AND status != 'deactivated'
                 ORDER BY last_seen DESC, id DESC LIMIT 1",
                [(int) $employee['id']]
            );
        }

        if (!$row && $deviceKey !== '') {
            // Claim an unassigned inventory laptop that matches this session fingerprint later via name.
            $row = Database::get(
                "SELECT * FROM devices
                 WHERE employee_id IS NULL AND status != 'deactivated'
                   AND (LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?))
                 ORDER BY id DESC LIMIT 1",
                [$employee['name'], '%' . $employee['name'] . '%']
            );
        }

        if (!$row) {
            Response::error('No laptop is saved for this owner yet. Sign in again with Laptop Owner login.', 404);
        }

        if ($refreshLastSeen) {
            Database::run(
                'UPDATE devices SET last_seen = NOW(), employee_id = COALESCE(employee_id, ?) WHERE id = ?',
                [(int) $employee['id'], (int) $row['id']]
            );
        }

        $loaded = self::loadDevice((int) $row['id']);
        if (!$loaded) {
            Response::error('Saved laptop could not be loaded.', 404);
        }

        return $loaded;
    }

    private static function loadDevice(int $id): ?array
    {
        return Database::get(
            'SELECT d.*, e.name AS employee_name, e.employee_id AS employee_code,
                    e.position AS employee_position, dept.name AS department_name
             FROM devices d
             LEFT JOIN employees e ON e.id = d.employee_id
             LEFT JOIN departments dept ON dept.id = d.department_id
             WHERE d.id = ?',
            [$id]
        );
    }

    private static function ensureRole(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        try {
            $col = Database::get("SHOW COLUMNS FROM users LIKE 'role'");
            $type = (string) ($col['Type'] ?? $col['type'] ?? '');
            if ($type === '' || !str_contains($type, 'laptop_owner')) {
                Database::pdo()->exec(
                    "ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','it_admin','manager','viewer','laptop_owner') NOT NULL DEFAULT 'viewer'"
                );
            }
        } catch (Throwable $e) {
            error_log('laptop_owner role migration failed: ' . $e->getMessage());
        }

        $ready = true;
    }

    private static function ensureDemoOwner(): void
    {
        $email = 'alex.rivera@company.com';
        $existing = Database::get('SELECT id FROM users WHERE email = ?', [$email]);
        if ($existing) {
            return;
        }

        $employee = Database::get('SELECT name FROM employees WHERE email = ?', [$email]);
        if (!$employee) {
            return;
        }

        try {
            Database::run(
                "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'laptop_owner', 'active')",
                [
                    $employee['name'],
                    $email,
                    password_hash('Owner@123456', PASSWORD_BCRYPT),
                ]
            );
        } catch (Throwable $e) {
            error_log('Demo laptop owner setup failed: ' . $e->getMessage());
        }
    }

    private static function passwordMatches(string $password, string $hash): bool
    {
        $verifyHash = str_starts_with($hash, '$2b$') ? ('$2y$' . substr($hash, 4)) : $hash;
        return password_verify($password, $verifyHash);
    }

    private static function clientIp(): string
    {
        $ip = Auth::clientIp();
        if (str_contains($ip, ',')) {
            $ip = trim(explode(',', $ip)[0]);
        }
        return substr($ip, 0, 45);
    }

    private static function clip(mixed $value, int $max): ?string
    {
        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }
        return substr($text, 0, $max);
    }

    private static function nullableNumber(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        return round((float) $value, 2);
    }

    private static function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        return max(0, min(100, (int) $value));
    }

    private static function buildWindowsBootstrapPs(string $serverUrl, string $userToken, string $deviceId): string
    {
        $serverUrl = str_replace("'", "''", rtrim($serverUrl, '/'));
        $userToken = str_replace("'", "''", $userToken);
        $deviceId = str_replace("'", "''", $deviceId);

        return <<<PS
\$ErrorActionPreference = 'Stop'
\$ProgressPreference = 'SilentlyContinue'
\$ServerUrl = '$serverUrl'
\$UserToken = '$userToken'
\$DeviceId = '$deviceId'
\$NodeVersion = '20.18.1'
\$installDir = Join-Path \$env:LOCALAPPDATA 'CompanyLaptopAgent'
\$nodeHome = Join-Path \$installDir 'node'
\$nodeExe = Join-Path \$nodeHome 'node.exe'
\$agentJs = Join-Path \$installDir 'agent.js'
\$configPath = Join-Path \$installDir 'agent_config.json'
\$taskName = 'CompanyLaptopMonitoringAgent'

function Get-NodeMajor([string]\$exe) {
  try {
    \$ver = & \$exe -v 2>\$null
    if (\$ver -match 'v?(\\d+)\\.') { return [int]\$Matches[1] }
  } catch {}
  return 0
}

Write-Host '[CLTMS] Preparing laptop tracking setup...' -ForegroundColor Cyan
if (-not (Test-Path \$installDir)) { New-Item -ItemType Directory -Path \$installDir -Force | Out-Null }

\$resolvedNode = \$null
\$pathNode = (Get-Command node -ErrorAction SilentlyContinue).Path
if (\$pathNode -and (Get-NodeMajor \$pathNode) -ge 18) { \$resolvedNode = \$pathNode }
if (-not \$resolvedNode -and (Test-Path \$nodeExe) -and (Get-NodeMajor \$nodeExe) -ge 18) { \$resolvedNode = \$nodeExe }

if (-not \$resolvedNode) {
  Write-Host '[CLTMS] Installing Node.js LTS (portable)...' -ForegroundColor Yellow
  \$arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
  \$zipName = "node-v\$NodeVersion-win-\$arch.zip"
  \$zipUrl = "https://nodejs.org/dist/v\$NodeVersion/\$zipName"
  \$zipPath = Join-Path \$env:TEMP \$zipName
  \$extractRoot = Join-Path \$env:TEMP "cltms-node-\$NodeVersion"
  try {
    Invoke-WebRequest -Uri \$zipUrl -OutFile \$zipPath -UseBasicParsing
    if (Test-Path \$extractRoot) { Remove-Item \$extractRoot -Recurse -Force -ErrorAction SilentlyContinue }
    Expand-Archive -Path \$zipPath -DestinationPath \$extractRoot -Force
    \$inner = Get-ChildItem \$extractRoot -Directory | Select-Object -First 1
    if (-not \$inner) { throw 'Node package empty' }
    if (Test-Path \$nodeHome) { Remove-Item \$nodeHome -Recurse -Force -ErrorAction SilentlyContinue }
    Move-Item -Path \$inner.FullName -Destination \$nodeHome -Force
    Remove-Item \$zipPath -Force -ErrorAction SilentlyContinue
    Remove-Item \$extractRoot -Recurse -Force -ErrorAction SilentlyContinue
    \$resolvedNode = \$nodeExe
  } catch {
    \$winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not \$winget) { throw 'Node.js 18+ could not be installed automatically. Install from https://nodejs.org and sign in again.' }
    & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
    \$pathNode = (Get-Command node -ErrorAction SilentlyContinue).Path
    if (-not \$pathNode -or (Get-NodeMajor \$pathNode) -lt 18) { throw 'Node.js install did not complete.' }
    \$resolvedNode = \$pathNode
  }
}

Write-Host "[CLTMS] Using Node: \$resolvedNode" -ForegroundColor Green
Write-Host '[CLTMS] Downloading company tracking agent...' -ForegroundColor Cyan
Invoke-WebRequest -Uri "\$ServerUrl/api/agent/agent.js" -OutFile \$agentJs -UseBasicParsing

\$bodyObj = @{
  device_id = \$(if (\$DeviceId) { \$DeviceId } else { "HW-\$env:COMPUTERNAME" })
  hostname = \$env:COMPUTERNAME
  os = 'Windows'
  os_version = [System.Environment]::OSVersion.VersionString
  architecture = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
  windows_user = \$env:USERNAME
  session_state = 'active'
}
\$headers = @{ Authorization = "Bearer \$UserToken"; 'Content-Type' = 'application/json' }
\$reg = Invoke-RestMethod -Method POST -Uri "\$ServerUrl/api/owner/agent-install" -Headers \$headers -Body (\$bodyObj | ConvertTo-Json -Compress)
if (-not \$reg.success -or -not \$reg.data.device_token) { throw (\$reg.message -or 'Registration rejected') }

@{
  server_url = (\$reg.data.server_url -or \$ServerUrl)
  device_token = \$reg.data.device_token
  device_id = \$reg.data.device_id
  asset_id = \$reg.data.asset_id
  heartbeat_interval = (\$reg.data.heartbeat_interval -or 60)
  installed_path = \$agentJs
} | ConvertTo-Json | Set-Content -Path \$configPath -Encoding UTF8

\$arg = "`"\$agentJs`" --server=`"\$(\$reg.data.server_url -or \$ServerUrl)`""
try {
  Unregister-ScheduledTask -TaskName \$taskName -Confirm:\$false -ErrorAction SilentlyContinue
  \$action = New-ScheduledTaskAction -Execute \$resolvedNode -Argument \$arg -WorkingDirectory \$installDir
  \$trigger = New-ScheduledTaskTrigger -AtLogOn -User \$env:USERNAME
  \$principal = New-ScheduledTaskPrincipal -UserId \$env:USERNAME -LogonType Interactive -RunLevel Limited
  \$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName \$taskName -Action \$action -Trigger \$trigger -Principal \$principal -Settings \$settings -Description 'Company Laptop Tracking Agent' | Out-Null
} catch {
  \$startup = [Environment]::GetFolderPath('Startup')
  \$lnk = Join-Path \$startup 'CompanyLaptopAgent.lnk'
  \$w = New-Object -ComObject WScript.Shell
  \$s = \$w.CreateShortcut(\$lnk)
  \$s.TargetPath = \$resolvedNode
  \$s.Arguments = \$arg
  \$s.WorkingDirectory = \$installDir
  \$s.Save()
}

Start-Process -FilePath \$resolvedNode -ArgumentList \$arg -WorkingDirectory \$installDir
Write-Host '[CLTMS] Node.js and tracking agent are ready on this laptop.' -ForegroundColor Green
PS;
    }

    private static function buildAgentInstallPayload(array $device, array $config): array
    {
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $serverUrl = rtrim((string) ($config['public_api_url'] ?? "{$scheme}://{$host}"), '/');

        return [
            'device_id' => $device['device_id'],
            'asset_id' => $device['asset_id'],
            'device_token' => $device['device_token'] ?? null,
            'server_url' => $serverUrl,
            'heartbeat_interval' => (int) ($config['heartbeat_interval_seconds'] ?? 60),
            'agent_installed_at' => $device['agent_installed_at'] ?? null,
            'agent_allowed' => (int) ($device['agent_allowed'] ?? 1),
            'bootstrap_url' => $serverUrl . '/api/owner/bootstrap.cmd',
            'agent_script_url' => $serverUrl . '/api/agent/agent.js',
        ];
    }
}
