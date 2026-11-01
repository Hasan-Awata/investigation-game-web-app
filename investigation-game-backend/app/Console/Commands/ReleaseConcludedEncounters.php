<?php

namespace App\Console\Commands;

use App\Enums\RoomStatus;
use App\Models\GameRoom;
use App\Services\EncounterGroupService;
use Illuminate\Console\Command;

class ReleaseConcludedEncounters extends Command
{
    protected $signature = 'encounters:release-concluded';
    protected $description = 'Release stale active encounters in solved and failed investigations';

    public function handle(EncounterGroupService $encounters): int
    {
        $closed = 0;
        GameRoom::query()
            ->whereIn('status', [RoomStatus::Solved, RoomStatus::Failed])
            ->whereHas('encounterGroups', fn ($query) => $query->where('status', 'active'))
            ->chunkById(100, function ($rooms) use ($encounters, &$closed): void {
                foreach ($rooms as $room) {
                    $closed += $encounters->closeForConcludedRoom($room);
                }
            });

        $this->info("Closed {$closed} encounter groups.");
        return self::SUCCESS;
    }
}
