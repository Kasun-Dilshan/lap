<?php

declare(strict_types=1);

class Audit
{
    public static function log(?array $user, string $action, string $entityType, mixed $entityId = '', mixed $details = null): void
    {
        try {
            $detailsStr = is_array($details) || is_object($details)
                ? json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : (string) ($details ?? '');

            Database::run(
                'INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                [
                    $user['id'] ?? null,
                    $user['email'] ?? 'System/Agent',
                    $action,
                    $entityType,
                    (string) ($entityId ?? ''),
                    $detailsStr,
                    Auth::clientIp(),
                ]
            );
        } catch (Throwable $e) {
            error_log('[Audit Log Error]: ' . $e->getMessage());
        }
    }
}
