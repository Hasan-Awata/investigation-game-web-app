<?php

namespace App\Support\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

trait BroadcastsAfterCommit
{
    protected function broadcastAfterCommit(object $event): void
    {
        DB::afterCommit(function () use ($event) {
            try {
                broadcast($event);
            } catch (\Throwable $e) {
                Log::warning('Broadcast failed after commit.', ['exception_class' => $e::class, 'event_class' => $event::class]);
            }
        });
    }
}

