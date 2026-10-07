<?php

declare(strict_types=1);

class SettingController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $list = Database::all('SELECT * FROM settings ORDER BY id ASC');
        $map = [];
        foreach ($list as $item) {
            $map[$item['setting_key']] = $item['setting_value'];
        }

        Response::success([
            'list' => $list,
            'map' => $map,
        ]);
    }

    public static function update(array $params, ?array $user, ?array $device, array $config): void
    {
        $updates = Request::body();
        if (!$updates || !is_array($updates)) {
            Response::error('Settings payload must be an object.');
        }

        foreach ($updates as $key => $value) {
            $exists = Database::get('SELECT id FROM settings WHERE setting_key = ?', [$key]);
            if ($exists) {
                Database::run(
                    'UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
                    [(string) $value, $key]
                );
            } else {
                Database::run(
                    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)',
                    [$key, (string) $value]
                );
            }
        }

        Audit::log($user, 'SETTINGS_UPDATED', 'SETTINGS', 'SYSTEM', $updates);
        Response::success(null, 'Settings updated successfully.');
    }
}
