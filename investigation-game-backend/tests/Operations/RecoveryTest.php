<?php

declare(strict_types=1);

namespace Tests\Operations;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Process\Process;

final class RecoveryTest extends TestCase
{
    public function test_process_restart_and_database_media_restore(): void
    {
        $base = dirname(__DIR__, 2);
        $root = sys_get_temp_dir().'/game-ops-'.bin2hex(random_bytes(8));
        mkdir($root, 0770, true);
        foreach (['storage/logs', 'storage/framework/views', 'public', 'backup'] as $directory) { mkdir($root.'/'.$directory, 0770, true); }
        touch($root.'/source.sqlite');
        $env = ['OPS_ROOT' => $root, 'APP_ENV' => 'testing', 'APP_DEBUG' => 'false', 'APP_KEY' => 'base64:'.base64_encode(str_repeat('s', 32)), 'APP_CONFIG_CACHE' => $root.'/config.php', 'DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => $root.'/source.sqlite', 'DB_URL' => '', 'QUEUE_CONNECTION' => 'database', 'DB_QUEUE_CONNECTION' => 'sqlite', 'DB_QUEUE' => 'ops', 'CACHE_STORE' => 'database', 'DB_CACHE_CONNECTION' => 'sqlite', 'BROADCAST_CONNECTION' => 'null', 'SESSION_DRIVER' => 'array', 'MAIL_MAILER' => 'array', 'LOG_CHANNEL' => 'stderr', 'CLOUDINARY_CLOUD_NAME' => '', 'CLOUDINARY_API_KEY' => '', 'CLOUDINARY_API_SECRET' => ''];
        $run = static function (array $arguments) use ($base, &$env): string {
            $process = new Process([PHP_BINARY, ...$arguments], $base, $env, null, 30);
            $process->mustRun();
            return trim($process->getOutput());
        };
        $fixture = 'tests/Operations/fixture.php';
        $worker = null;
        try {
            $run([$fixture, 'init']);
            self::assertSame('1', $run([$fixture, 'cache']));
            self::assertSame('2', $run([$fixture, 'cache']));
            for ($attempt = 0; $attempt < 5; $attempt++) {
                self::assertSame('401', $run([$fixture, 'login']));
            }
            self::assertSame('429', $run([$fixture, 'login']));
            $run([$fixture, 'vote']);
            $worker = new Process([PHP_BINARY, 'artisan', 'queue:work', 'database', '--queue=ops', '--sleep=1', '--tries=3', '--timeout=60'], $base, $env, null, 30);
            $worker->start();
            usleep(500000);
            $worker->stop(1);
            self::assertSame(0, json_decode($run([$fixture, 'snapshot']), true)['resolutions']);
            sleep(6);
            $overdue = new Process([PHP_BINARY, 'scripts/operations-status.php', '--overdue-seconds=0'], $base, $env, null, 30);
            $overdue->run();
            self::assertSame(1, $overdue->getExitCode());
            self::assertSame(1, json_decode($overdue->getOutput(), true)['overdue_encounters']);
            $run(['artisan', 'queue:work', 'database', '--queue=ops', '--stop-when-empty', '--sleep=1', '--tries=3', '--timeout=60']);
            self::assertSame(1, json_decode($run([$fixture, 'snapshot']), true)['resolutions']);
            $run([$fixture, 'duplicate']);
            $run(['artisan', 'queue:work', 'database', '--queue=ops', '--stop-when-empty', '--sleep=1', '--tries=3']);
            self::assertSame(1, json_decode($run([$fixture, 'snapshot']), true)['resolutions']);
            // With all writers stopped, copying SQLite and its media is a consistent synthetic backup.
            copy($root.'/source.sqlite', $root.'/backup/database.sqlite');
            copy($root.'/public/assets/cases/proof.txt', $root.'/backup/proof.txt');
            copy($root.'/backup/database.sqlite', $root.'/restored.sqlite');
            self::assertSame(hash_file('sha256', $root.'/source.sqlite'), hash_file('sha256', $root.'/restored.sqlite'));
            $env['DB_DATABASE'] = $root.'/restored.sqlite';
            $env['OPS_ROOT'] = $root.'/restore';
            mkdir($env['OPS_ROOT'].'/public/assets/cases', 0770, true);
            copy($root.'/backup/proof.txt', $env['OPS_ROOT'].'/public/assets/cases/proof.txt');
            self::assertSame('resumed', $run([$fixture, 'resume']));
            self::assertSame('resumed', $run([$fixture, 'resume']));
            $run([$fixture, 'vote']);
            sleep(6);
            $run(['artisan', 'queue:work', 'database', '--queue=ops', '--stop-when-empty', '--sleep=1', '--tries=3']);
            self::assertSame(['resolutions' => 2, 'jobs' => 0, 'failed' => 0, 'completed' => 1], json_decode($run([$fixture, 'snapshot']), true));
            self::assertSame(0, json_decode($run(['scripts/operations-status.php']), true)['failed']);
            $run([$fixture, 'failed']);
            $check = new Process([PHP_BINARY, 'scripts/operations-status.php'], $base, $env, null, 30);
            $check->run();
            self::assertSame(1, $check->getExitCode());
            $run([$fixture, 'clear-failed']);
            $run(['scripts/operations-status.php']);
        } finally {
            if ($worker?->isRunning()) { $worker->stop(1); }
            $resolved = realpath($root);
            if ($resolved === false || realpath(dirname($resolved)) !== realpath(sys_get_temp_dir()) || !str_starts_with(basename($resolved), 'game-ops-')) {
                throw new \RuntimeException('Refusing cleanup outside the owned temporary root');
            }
            // Only remove the uniquely created test tree; never follow directory links.
            $remove = static function (string $path) use (&$remove): void {
                if (is_link($path) || is_file($path)) { unlink($path); return; }
                foreach (new \DirectoryIterator($path) as $entry) { if (!$entry->isDot()) { $remove($entry->getPathname()); } }
                rmdir($path);
            };
            $remove($root);
        }
    }
}
