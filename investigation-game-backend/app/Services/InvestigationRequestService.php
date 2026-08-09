<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use Illuminate\Support\Facades\DB;
use App\Support\Result;
use App\Events\EvidenceDiscovered;

class InvestigationRequestService
{
    public function processRequest(GameRoom $room, array $submittedIds): Result
    {
        // 1. Establish the room's total known knowledge base
        $initialEvidences = $room->gameCase->evidences()->where('is_initial', true)->pluck('id')->toArray();
        $unlockedEvidences = $room->unlockedEvidences()->pluck('evidences.id')->toArray();
        $possessedEvidences = array_unique(array_merge($initialEvidences, $unlockedEvidences));

        if (array_diff($submittedIds, $possessedEvidences)) {
            return Result::failure("Unauthorized: You cannot file a request using evidence you have not yet discovered.");
        }

        sort($submittedIds);

        $availableRequests = InvestigationRequest::with('requiredEvidences')
            ->where('case_id', $room->case_id)
            ->get();

        foreach ($availableRequests as $request) {
            $requiredIds = $request->requiredEvidences->pluck('id')->toArray();
            sort($requiredIds);

            if ($requiredIds === $submittedIds) {
                // Prevent duplicate submissions of the exact same request
                if ($room->completedRequests()->where('request_id', $request->id)->exists()) {
                    return Result::failure("This {$request->request_type->label()} has already been executed.");
                }

                // 2. EXPLICITLY RECORD THE COMBO AS COMPLETE
                $room->completedRequests()->syncWithoutDetaching([$request->id]);

                $unlockedEvidence = [];
                $unlockedLevels = [];

                // 3. Process Dynamic Unlocks
                if ($request->unlocks_evidence_id) {
                    DB::table('room_evidences')->updateOrInsert([
                        'room_id' => $room->id,
                        'evidence_id' => $request->unlocks_evidence_id
                    ]);
                    $unlockedEvidence[] = $request->unlocks_evidence_id;
                    EvidenceDiscovered::dispatch($room, $unlockedEvidence);
                }

                if ($request->unlocks_level_id) {
                    DB::table('room_unlocked_levels')->updateOrInsert([
                        'room_id' => $room->id,
                        'level_id' => $request->unlocks_level_id
                    ]);
                    $unlockedLevels[] = $request->unlocks_level_id;
                }

                return Result::success([
                    'message' => "{$request->request_type->label()} approved by the DA.",
                    'unlocked_evidence' => $unlockedEvidence,
                    'unlocked_levels' => $unlockedLevels,
                    'request_type' => $request->request_type->value
                ]);
            }
        }

        return Result::failure("The DA rejected your request. The provided evidence does not establish sufficient grounds.");
    }
}