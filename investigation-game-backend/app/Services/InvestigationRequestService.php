<?php

namespace App\Services;

use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use App\Enums\RoomStatus;
use App\Support\Result;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Events\ItemsUnlocked;
use App\Events\RequestFiled;

class InvestigationRequestService
{
    use BroadcastsAfterCommit;
    public function processRequest(GameRoom $room, array $submittedEvidenceIds = [], array $submittedCharacterIds = []): Result
    {
        return DB::transaction(function () use ($room, $submittedEvidenceIds, $submittedCharacterIds) {
            $room = GameRoom::where('id', $room->id)->lockForUpdate()->firstOrFail();

            if ($room->status !== RoomStatus::Active) {
                return Result::failure('This investigation has already concluded.');
            }

            $submittedEvidenceIds = $this->normalizeIds($submittedEvidenceIds);
            $submittedCharacterIds = $this->normalizeIds($submittedCharacterIds);

        if (!InvestigationRequest::hasMinimumItems(count($submittedEvidenceIds), count($submittedCharacterIds))) {
            return Result::failure(InvestigationRequest::MIN_ITEMS_MESSAGE);
        }

        $signature = $this->computeSignature($submittedEvidenceIds, $submittedCharacterIds);

        // Evidence possession: single source of truth is the room's runtime pivot state.
        $possessedEvidences = $room->getPossessedEvidenceIds();

        if (array_diff($submittedEvidenceIds, $possessedEvidences)) {
            return Result::failure("Unauthorized: You cannot file a request using evidence you have not yet discovered.");
        }

        // Character possession: single source of truth is the room's runtime pivot state.
        $possessedCharacters = $room->getUnlockedCharacterIds();

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
            $hasUnrelatedExtras = $availableRequests->contains(function (InvestigationRequest $request) use ($submittedEvidenceIds, $submittedCharacterIds) {
                if (! $request->unlocks_evidence_id && ! $request->unlocks_level_id) {
                    return false;
                }

                $requiredEvidenceIds = $this->normalizeIds($request->requiredEvidences->pluck('id')->all());
                $requiredCharacterIds = $this->normalizeIds($request->requiredCharacters->pluck('id')->all());

                return count($requiredEvidenceIds) + count($requiredCharacterIds) < count($submittedEvidenceIds) + count($submittedCharacterIds)
                    && empty(array_diff($requiredEvidenceIds, $submittedEvidenceIds))
                    && empty(array_diff($requiredCharacterIds, $submittedCharacterIds));
            });

            if ($hasUnrelatedExtras) {
                return Result::failure('Your request contains unnecessary items that muddy the warrant. Narrow your selection to only the directly connected evidence and characters.');
            }

            if ($matchingRequests->isNotEmpty()) {
                return Result::failure("The DA rejected your request. This combination does not lead to any new lead.");
            }

            return Result::failure("The DA rejected your request. The provided items do not establish sufficient grounds.");
        }

        $request = $actionableRequests->first();

        // A submitted combination that simply re-files a request the room has
        // already executed reports the execution guard first — the canonical
        // failure for "executing the same warrant twice".
        if ($room->completedRequests()->where('request_id', $request->id)->exists()) {
            return Result::failure("This {$request->request_type->label()} has already been executed.");
        }

        if ($room->filedRequests()->where('signature', $signature)->exists()) {
            return Result::failure('This exact combination has already been filed by your team.');
        }

        $room->completedRequests()->syncWithoutDetaching([$request->id]);

        // ItemsUnlocked requires Eloquent collections (typed event contract)
        $unlockedEvidences = new EloquentCollection();
        $unlockedLevels = new EloquentCollection();

        // Unlocks are resolved strictly inside the room's case (E-38): a
        // mis-wired or cross-case target must fail silently instead of
        // leaking another case's evidence or level.
        if ($request->unlocks_evidence_id) {
            $evidence = \App\Models\Evidence::where('case_id', $room->case_id)
                ->where('id', $request->unlocks_evidence_id)
                ->first();

            if ($evidence) {
                $room->unlockedEvidences()->syncWithoutDetaching([$evidence->id]);
                $evidence->makeHidden(['is_vital_for_conviction']);
                $unlockedEvidences->push($evidence);
            }
        }

        if ($request->unlocks_level_id) {
            $level = \App\Models\Level::whereHas('zone', fn ($zone) => $zone->where('case_id', $room->case_id))
                ->where('id', $request->unlocks_level_id)
                ->first();

            if ($level) {
                $room->unlockedLevels()->syncWithoutDetaching([$level->id]);
                $unlockedLevels->push($level);
            }
        }

        if ($unlockedEvidences->isNotEmpty() || $unlockedLevels->isNotEmpty()) {
            $this->broadcastAfterCommit(new ItemsUnlocked($room, $unlockedEvidences->isNotEmpty() ? $unlockedEvidences : null, $unlockedLevels->isNotEmpty() ? $unlockedLevels : null, null, null));
        }

        // LOG THE PERMANENT HISTORY & BROADCAST
        $filedRecord = $room->filedRequests()->create([
            'request_type' => $request->request_type->value,
            'signature' => $signature,
            'evidence_ids' => $submittedEvidenceIds,
            'character_ids' => $submittedCharacterIds,
        ]);
        $this->broadcastAfterCommit(new RequestFiled($room, $filedRecord));

        return Result::success([
            'message' => "{$request->request_type->label()} approved by the DA.",
            'unlocked_evidence' => $unlockedEvidences->toArray(),
            'unlocked_levels' => $unlockedLevels->toArray(),
            'request_type' => $request->request_type->value
        ]);
        });
    }

    private function computeSignature(array $submittedEvidenceIds, array $submittedCharacterIds): string
    {
        $signaturePayload = 'E:' . implode(',', $submittedEvidenceIds) . '|C:' . implode(',', $submittedCharacterIds);

        return hash('sha256', $signaturePayload);
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
