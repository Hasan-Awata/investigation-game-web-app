<?php

declare(strict_types=1);

use App\Models\EncounterGroup;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require dirname(__DIR__).'/vendor/autoload.php';

try {
    $options = getopt('', ['overdue-seconds:']);
    $threshold = filter_var($options['overdue-seconds'] ?? 30, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    if ($threshold === false) {
        throw new InvalidArgumentException('Invalid threshold');
    }
    $app = require dirname(__DIR__).'/bootstrap/app.php';
    $app->make(Kernel::class)->bootstrap();
    $connection = config('queue.default');
    $queue = config("queue.connections.$connection");
    if (($queue['driver'] ?? null) !== 'database' || config('queue.failed.driver') !== 'database-uuids') {
        throw new RuntimeException('Unsupported queue configuration');
    }
    $jobs = DB::connection($queue['connection'])->table($queue['table'])->where('queue', $queue['queue']);
    $overdue = EncounterGroup::query()->where('status', 'active')
        ->whereHas('room', fn ($query) => $query->where('status', 'active'))
        ->where('finalizes_at', '<', now()->subSeconds($threshold));
    $failed = DB::connection(config('queue.failed.database'))->table(config('queue.failed.table'))
        ->where('connection', $connection)->where('queue', $queue['queue']);
    $result = [
        'queued' => (clone $jobs)->count(),
        'reserved' => (clone $jobs)->whereNotNull('reserved_at')->count(),
        'failed' => (clone $failed)->count(),
        'overdue_encounters' => (clone $overdue)->count(),
        'overdue_encounter_ids' => (clone $overdue)->orderBy('id')->limit(20)->pluck('id')->all(),
        'failed_job_ids' => (clone $failed)->orderBy('id')->limit(20)->pluck('uuid')->all(),
    ];
    echo json_encode($result, JSON_THROW_ON_ERROR).PHP_EOL;
    exit($result['failed'] > 0 || $result['overdue_encounters'] > 0 ? 1 : 0);
} catch (Throwable $exception) {
    // Never echo exception messages: connection errors may contain credentials.
    fwrite(STDERR, json_encode(['error' => 'Operational inspection failed', 'exception_class' => $exception::class]).PHP_EOL);
    exit(2);
}
