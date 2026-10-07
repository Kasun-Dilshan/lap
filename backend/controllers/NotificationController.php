<?php

declare(strict_types=1);

class NotificationController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $notifications = Database::all(
            'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20'
        );
        $unread = (int) (Database::get('SELECT COUNT(*) as c FROM notifications WHERE is_read = 0')['c'] ?? 0);

        Response::json([
            'success' => true,
            'data' => $notifications,
            'unread_count' => $unread,
        ]);
    }

    public static function markRead(array $params, ?array $user, ?array $device, array $config): void
    {
        Database::run('UPDATE notifications SET is_read = 1 WHERE id = ?', [$params['id']]);
        Response::success(null, 'Notification marked as read.');
    }

    public static function markAllRead(array $params, ?array $user, ?array $device, array $config): void
    {
        Database::run('UPDATE notifications SET is_read = 1');
        Response::success(null, 'All notifications marked as read.');
    }
}
