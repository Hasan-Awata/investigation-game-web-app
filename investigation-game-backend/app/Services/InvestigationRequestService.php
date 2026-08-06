<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use Illuminate\Support\Facades\DB;
use App\Support\Result;
use App\Events\EvidenceDiscovered;

class InvestigationRequestService
{
    /**
     * Evaluates if the submitted evidence qualifies for a procedural request.
     */
    public function processRequest(GameRoom $room, array $submittedIds): Result
    {
        // 1. Establish the room's total known knowledge base
        $initialEvidences = $room->gameCase->evidences()->where('is_initial', true)->pluck('id')->toArray();
        $unlockedEvidences = $room->unlockedEvidences()->pluck('evidences.id')->toArray();
        $possessedEvidences = array_unique(array_merge($initialEvidences, $unlockedEvidences));

        // 2. Validate the players actually own the evidence they are trying to combine
        if (array_diff($submittedIds, $possessedEvidences)) {
            return Result::failure("Unauthorized: You cannot file a request using evidence you have not yet discovered.");
        }

        // Sort to ensure array equality checks work regardless of input order
        sort($submittedIds);

        // 3. Fetch all active requests for this case
        $availableRequests = InvestigationRequest::with('requiredEvidences')
            ->where('case_id', $room->case_id)
            ->get();

        foreach ($availableRequests as $request) {
            $requiredIds = $request->requiredEvidences->pluck('id')->toArray();
            sort($requiredIds);

            // 4. Check for a perfect match
            if ($requiredIds === $submittedIds) {
                $unlockedId = $request->unlocks_evidence_id;

                if (in_array($unlockedId, $possessedEvidences)) {
                    return Result::failure("This {$request->request_type->label()} has already been executed.");
                }

                // 5. Update State & Broadcast via Reverb
                DB::table('room_evidences')->updateOrInsert([
                    'room_id' => $room->id,
                    'evidence_id' => $unlockedId
                ]);

                EvidenceDiscovered::dispatch($room, [$unlockedId]);

                return Result::success([
                    'message' => "{$request->request_type->label()} approved. New files added to your case board.",
                    'unlocked_evidence' => [$unlockedId],
                    'request_type' => $request->request_type->value
                ]);
            }
        }

        return Result::failure("The DA rejected your request. The provided evidence does not establish sufficient grounds.");
    }
}