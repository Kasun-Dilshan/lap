<?php

declare(strict_types=1);

class EnrollmentController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $tokens = Database::all(
            "SELECT et.*, u.name as created_by_name,
                    CASE
                      WHEN et.status = 'revoked' THEN 'revoked'
                      WHEN et.status = 'exhausted' THEN 'exhausted'
                      WHEN et.expires_at < NOW() THEN 'expired'
                      ELSE 'active'
                    END as current_status
             FROM enrollment_tokens et
             LEFT JOIN users u ON et.created_by = u.id
             ORDER BY et.created_at DESC"
        );
        Response::success($tokens);
    }

    public static function store(array $params, ?array $user, ?array $device, array $config): void
    {
        $body = Request::body();
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            Response::error('Token name or description is required.');
        }

        $randomHex = strtoupper(bin2hex(random_bytes(6)));
        $token = sprintf(
            'ENROLL-%s-%s-%s',
            substr($randomHex, 0, 4),
            substr($randomHex, 4, 4),
            substr($randomHex, 8, 4)
        );

        $maxUses = max(1, (int) ($body['max_uses'] ?? 1));
        $days = max(1, (int) ($body['expiry_days'] ?? 7));

        $result = Database::run(
            'INSERT INTO enrollment_tokens (token, name, max_uses, uses_count, expires_at, created_by, status)
             VALUES (?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL ? DAY), ?, \'active\')',
            [$token, $name, $maxUses, $days, $user['id'] ?? null]
        );

        Audit::log($user, 'ENROLLMENT_TOKEN_CREATED', 'ENROLLMENT', $token, [
            'name' => $name,
            'max_uses' => $maxUses,
            'expiry_days' => $days,
        ]);

        Response::success([
            'id' => $result['insertId'],
            'token' => $token,
            'name' => $name,
            'max_uses' => $maxUses,
            'expiry_days' => $days,
        ], 'Enrollment token created successfully.', 201);
    }

    public static function revoke(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $tokenRecord = Database::get('SELECT * FROM enrollment_tokens WHERE id = ?', [$id]);
        if (!$tokenRecord) {
            Response::error('Enrollment token not found.', 404);
        }

        Database::run("UPDATE enrollment_tokens SET status = 'revoked' WHERE id = ?", [$id]);
        Audit::log($user, 'ENROLLMENT_TOKEN_REVOKED', 'ENROLLMENT', $tokenRecord['token'], [
            'name' => $tokenRecord['name'],
        ]);
        Response::success(null, 'Enrollment token revoked successfully.');
    }

    public static function destroy(array $params, ?array $user, ?array $device, array $config): void
    {
        $id = $params['id'];
        $tokenRecord = Database::get('SELECT * FROM enrollment_tokens WHERE id = ?', [$id]);
        if (!$tokenRecord) {
            Response::error('Enrollment token not found.', 404);
        }

        Database::run('DELETE FROM enrollment_tokens WHERE id = ?', [$id]);
        Audit::log($user, 'ENROLLMENT_TOKEN_DELETED', 'ENROLLMENT', $tokenRecord['token'], [
            'name' => $tokenRecord['name'],
        ]);
        Response::success(null, 'Enrollment token deleted.');
    }
}
