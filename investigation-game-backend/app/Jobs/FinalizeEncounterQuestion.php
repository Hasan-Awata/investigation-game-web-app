<?php

namespace App\Jobs;

use App\Models\EncounterGroup;
use App\Services\EncounterGroupService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class FinalizeEncounterQuestion implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly int $groupId,
        public readonly int $questionId,
        public readonly string $deadline,
    ) {}

    public function handle(EncounterGroupService $service): void
    {
        $group = EncounterGroup::query()->find($this->groupId);
        if ($group) $service->finalize($group, $this->questionId, $this->deadline);
    }
}
