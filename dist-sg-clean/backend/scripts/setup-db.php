<?php

declare(strict_types=1);

/**
 * Import schema + seed into the configured SiteGround MySQL database.
 * Usage: php scripts/setup-db.php
 *
 * SiteGround note: the database must already exist (created in Site Tools).
 * This script does NOT create databases — it only creates tables + seed rows.
 */

$config = require dirname(__DIR__) . '/config/config.php';
$db = $config['db'];

$host = $db['host'];
$port = $db['port'];
$user = $db['user'];
$pass = $db['password'];
$name = $db['name'];

$schemaPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'schema.sql';
$seedPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'seed.sql';

if (!is_file($schemaPath) || !is_file($seedPath)) {
    fwrite(STDERR, "schema.sql or seed.sql not found in /database\n");
    exit(1);
}

function splitSqlStatements(string $sql): array
{
    $statements = [];
    $current = '';
    $inString = false;
    $stringChar = '';
    $len = strlen($sql);

    for ($i = 0; $i < $len; $i++) {
        $char = $sql[$i];
        $prev = $i > 0 ? $sql[$i - 1] : '';

        if ($inString) {
            $current .= $char;
            if ($char === $stringChar && $prev !== '\\') {
                if ($i + 1 < $len && $sql[$i + 1] === $stringChar) {
                    $current .= $sql[$i + 1];
                    $i++;
                } else {
                    $inString = false;
                }
            }
            continue;
        }

        if ($char === '-' && ($i + 1) < $len && $sql[$i + 1] === '-') {
            while ($i < $len && $sql[$i] !== "\n") {
                $i++;
            }
            continue;
        }

        if ($char === "'" || $char === '"') {
            $inString = true;
            $stringChar = $char;
            $current .= $char;
            continue;
        }

        if ($char === ';') {
            $trimmed = trim($current);
            if ($trimmed !== '') {
                $statements[] = $trimmed;
            }
            $current = '';
            continue;
        }

        $current .= $char;
    }

    $last = trim($current);
    if ($last !== '') {
        $statements[] = $last;
    }

    return $statements;
}

function shouldSkipStatement(string $statement): bool
{
    return (bool) preg_match('/^\s*(CREATE\s+DATABASE|USE)\b/i', $statement);
}

function runSqlFile(PDO $pdo, string $path, bool $ignoreDuplicates = false): void
{
    $sql = file_get_contents($path);
    if ($sql === false) {
        throw new RuntimeException("Unable to read {$path}");
    }

    foreach (splitSqlStatements($sql) as $statement) {
        if (shouldSkipStatement($statement)) {
            continue;
        }

        try {
            $pdo->exec($statement);
        } catch (Throwable $e) {
            if ($ignoreDuplicates && (
                str_contains($e->getMessage(), 'Duplicate')
                || str_contains($e->getMessage(), '1062')
            )) {
                continue;
            }
            throw $e;
        }
    }
}

echo "Connecting to SiteGround MySQL {$user}@{$host}:{$port}/{$name}...\n";

try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (Throwable $e) {
    fwrite(STDERR, 'Connection failed: ' . $e->getMessage() . "\n");
    fwrite(STDERR, "Check backend/.env SiteGround details.\n");
    fwrite(STDERR, "If running locally (not on SiteGround), set DB_HOST to your SiteGround MySQL hostname and enable Remote MySQL.\n");
    exit(1);
}

echo "Importing schema into {$name}...\n";
runSqlFile($pdo, $schemaPath);

echo "Importing seed data...\n";
runSqlFile($pdo, $seedPath, true);

echo "Done. SiteGround database '{$name}' is ready.\n";
echo "Default admin: admin@company.com / Admin@123456\n";
