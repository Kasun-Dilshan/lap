<?php

declare(strict_types=1);

class AuditController
{
    public static function index(array $params, ?array $user, ?array $device, array $config): void
    {
        $action = (string) Request::query('action', '');
        $entityType = (string) Request::query('entity_type', '');
        $search = (string) Request::query('search', '');
        $limit = max(1, (int) Request::query('limit', 100));
        $page = max(1, (int) Request::query('page', 1));

        $sql = 'SELECT * FROM audit_logs WHERE 1=1';
        $bind = [];

        if ($action !== '' && $action !== 'all') {
            $sql .= ' AND action = ?';
            $bind[] = $action;
        }
        if ($entityType !== '' && $entityType !== 'all') {
            $sql .= ' AND entity_type = ?';
            $bind[] = $entityType;
        }
        if (trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $sql .= ' AND (user_email LIKE ? OR action LIKE ? OR entity_id LIKE ? OR details LIKE ?)';
            array_push($bind, $term, $term, $term, $term);
        }

        $sql .= ' ORDER BY created_at DESC LIMIT ' . $limit . ' OFFSET ' . (($page - 1) * $limit);
        $logs = Database::all($sql, $bind);
        $total = (int) (Database::get('SELECT COUNT(*) as total FROM audit_logs')['total'] ?? 0);

        Response::json([
            'success' => true,
            'data' => $logs,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
            ],
        ]);
    }
}
