<?php

namespace App\Services;

use App\Events\ItemsUnlocked;
use App\Events\RequestFiled;
use App\Http\Resources\EvidenceBoardResource;
use App\Models\Evidence;
use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use App\Models\Level;
use App\Support\Result;
use Illuminate\Support\Facades\DB;

class InvestigationRequestService
{
    public function processRequest(GameRoom $room, array $submittedIds): Result
    {
        $initialEvidences = $room->gameCase->evidences()->where('is_initial', true)->pluck('id')->toArray();
        $unlockedEvidencesList = $room->unlockedEvidences()->pluck('evidences.id')->toArray();
        $possessedEvidences = array_unique(array_merge($initialEvidences, $unlockedEvidencesList));

        if (array_diff($submittedIds, $possessedEvidences)) {
            return Result::failure('Unauthorized: You cannot file a request using evidence you have not yet discovered.');
        }

        sort($submittedIds);

        $availableRequests = InvestigationRequest::with('requiredEvidences')
            ->where('case_id', $room->case_id)
            ->get();

        foreach ($availableRequests as $request) {
            $requiredIds = $request->requiredEvidences->pluck('id')->toArray();
            sort($requiredIds);

            if ($requiredIds === $submittedIds) {
                if ($room->completedRequests()->where('request_id', $request->id)->exists()) {
                    return Result::failure("This {$request->request_type->label()} has already been executed.");
                }

                $room->completedRequests()->syncWithoutDetaching([$request->id]);

                $unlockedEvidences = collect();
                $unlockedLevels = collect();

                if ($request->unlocks_evidence_id) {
                    DB::table('room_evidences')->updateOrInsert([
                        'room_id' => $room->id,
                        'evidence_id' => $request->unlocks_evidence_id,
                    ]);
                    $evidence = Evidence::with('assets')->find($request->unlocks_evidence_id);
                    if ($evidence) {
                        $unlockedEvidences->push($evidence);
                    }
                }

                if ($request->unlocks_level_id) {
                    DB::table('room_unlocked_levels')->updateOrInsert([
                        'room_id' => $room->id,
                        'level_id' => $request->unlocks_level_id,
                    ]);
                    $level = Level::find($request->unlocks_level_id);
                    if ($level) {
                        $unlockedLevels->push($level);
                    }
                }

                if ($unlockedEvidences->isNotEmpty() || $unlockedLevels->isNotEmpty()) {
                    ItemsUnlocked::dispatch($room, $unlockedEvidences->isNotEmpty() ? $unlockedEvidences : null, $unlockedLevels->isNotEmpty() ? $unlockedLevels : null, null, null, null);
                }

                // NEW: LOG THE PERMANENT HISTORY & BROADCAST
                $filedRecord = $room->filedRequests()->create([
                    'request_type' => $request->request_type->value,
                    'evidence_ids' => $submittedIds,
                ]);
                RequestFiled::dispatch($room, $filedRecord);

                return Result::success([
                    'message' => "{$request->request_type->label()} approved by the DA.",
                    'unlocked_evidence' => EvidenceBoardResource::collection($unlockedEvidences)->resolve(),
                    'unlocked_levels' => $unlockedLevels->toArray(),
                    'request_type' => $request->request_type->value,
                ]);
            }
        }

        return Result::failure('The DA rejected your request. The provided evidence does not establish sufficient grounds.');
    }
}
