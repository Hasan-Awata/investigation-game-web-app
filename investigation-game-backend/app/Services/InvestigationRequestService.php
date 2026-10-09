<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use App\Support\Result;
use App\Events\ItemsUnlocked;
use App\Events\RequestFiled;

class InvestigationRequestService
{
    public function processRequest(GameRoom $room, array $submittedEvidenceIds = [], array $submittedCharacterIds = []): Result
    {
        $submittedEvidenceIds = $this->normalizeIds($submittedEvidenceIds);
        $submittedCharacterIds = $this->normalizeIds($submittedCharacterIds);

        if (count($submittedEvidenceIds) + count($submittedCharacterIds) < 2) {
            return Result::failure("A procedural request requires at least two items.");
        }

        // Evidence possession: initial evidences union unlocked evidences
        $initialEvidences = $room->gameCase->evidences()->where('is_initial', true)->pluck('id')->toArray();
        $unlockedEvidencesList = $room->unlockedEvidences()->pluck('evidences.id')->toArray();
        $possessedEvidences = array_unique(array_merge($initialEvidences, $unlockedEvidencesList));

        if (array_diff($submittedEvidenceIds, $possessedEvidences)) {
            return Result::failure("Unauthorized: You cannot file a request using evidence you have not yet discovered.");
        }

        // Character possession: initial characters union unlocked room characters
        $initialCharacters = $room->gameCase->characters()->where('is_initial', true)->pluck('id')->toArray();
        $unlockedCharactersList = $room->characters()->wherePivot('is_unlocked', true)->pluck('characters.id')->toArray();
        $possessedCharacters = array_unique(array_merge($initialCharacters, $unlockedCharactersList));

        if (array_diff($submittedCharacterIds, $possessedCharacters)) {
            return Result::failure("Unauthorized: You cannot file a request using a character you have not yet discovered.");
        }

        $availableRequests = InvestigationRequest::with(['requiredEvidences', 'requiredCharacters'])
            ->where('case_id', $room->case_id)
            ->get();

        $matchingRequests = $availableRequests->filter(function (InvestigationRequest $request) use ($submittedEvidenceIds, $submittedCharacterIds) {
            $requiredEvidenceIds = $this->normalizeIds($request->requiredEvidences->pluck('id')->all());
            $requiredCharacterIds = $this->normalizeIds($request->requiredCharacters->pluck('id')->all());

            return $requiredEvidenceIds === $submittedEvidenceIds
                && $requiredCharacterIds === $submittedCharacterIds;
        });

        // A submission is only valid if it actually leads to an unlocked evidence or level
        $actionableRequests = $matchingRequests->filter(
            fn (InvestigationRequest $request) => $request->unlocks_evidence_id || $request->unlocks_level_id
        );

        if ($actionableRequests->isEmpty()) {
            if ($matchingRequests->isNotEmpty()) {
                return Result::failure("The DA rejected your request. This combination does not lead to any new lead.");
            }

            return Result::failure("The DA rejected your request. The provided items do not establish sufficient grounds.");
        }

        $request = $actionableRequests->first();

        if ($room->completedRequests()->where('request_id', $request->id)->exists()) {
            return Result::failure("This {$request->request_type->label()} has already been executed.");
        }

        $room->completedRequests()->syncWithoutDetaching([$request->id]);

        // ItemsUnlocked requires Eloquent collections (typed event contract)
        $unlockedEvidences = new EloquentCollection();
        $unlockedLevels = new EloquentCollection();

        if ($request->unlocks_evidence_id) {
            DB::table('room_evidences')->updateOrInsert([
                'room_id' => $room->id,
                'evidence_id' => $request->unlocks_evidence_id
            ]);
            $evidence = \App\Models\Evidence::find($request->unlocks_evidence_id);
            if ($evidence) $unlockedEvidences->push($evidence);
        }

        if ($request->unlocks_level_id) {
            DB::table('room_unlocked_levels')->updateOrInsert([
                'room_id' => $room->id,
                'level_id' => $request->unlocks_level_id
            ]);
            $level = \App\Models\Level::find($request->unlocks_level_id);
            if ($level) $unlockedLevels->push($level);
        }

        if ($unlockedEvidences->isNotEmpty() || $unlockedLevels->isNotEmpty()) {
            ItemsUnlocked::dispatch($room, $unlockedEvidences->isNotEmpty() ? $unlockedEvidences : null, $unlockedLevels->isNotEmpty() ? $unlockedLevels : null, null, null, null);
        }

        // LOG THE PERMANENT HISTORY & BROADCAST
        $filedRecord = $room->filedRequests()->create([
            'request_type' => $request->request_type->value,
            'evidence_ids' => $submittedEvidenceIds,
            'character_ids' => $submittedCharacterIds,
        ]);
        RequestFiled::dispatch($room, $filedRecord);

        return Result::success([
            'message' => "{$request->request_type->label()} approved by the DA.",
            'unlocked_evidence' => $unlockedEvidences->toArray(),
            'unlocked_levels' => $unlockedLevels->toArray(),
            'request_type' => $request->request_type->value
        ]);
    }

    private function normalizeIds(array $ids): array
    {
        return collect($ids)
            ->filter(fn ($id) => $id !== null && $id !== '')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }
}
