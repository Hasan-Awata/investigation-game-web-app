<?php

namespace App\Services;

use App\Enums\RoomStatus;
use App\Events\ItemsUnlocked;
use App\Events\RequestFiled;
use App\Models\Evidence;
use App\Models\GameRoom;
use App\Models\InvestigationRequest;
use App\Models\Level;
use App\Support\Concerns\BroadcastsAfterCommit;
use App\Support\Result;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;

class InvestigationRequestService
{
    use BroadcastsAfterCommit;

    /** Player-safe metadata only; the analysis requirements stay on the server. */
    public function availableRequests(GameRoom $room): array
    {
        return $this->eligibleRequestsQuery($room)
            ->select(['id', 'request_type', 'unlocks_level_id', 'unlocks_evidence_id'])
            ->with([
                'gatedLevels' => fn ($levels) => $this->discoveredLevels($levels->getQuery(), $room)
                    ->select(['levels.id', 'required_request_id', 'title'])->orderBy('order_index')->orderBy('id'),
                'unlockedLevel' => fn ($level) => $level->select(['id', 'title'])
                    ->whereHas('zone', fn (Builder $zone) => $zone->where('case_id', $room->case_id)),
                'unlockedEvidence' => fn ($evidence) => $evidence->select(['id', 'title'])->where('case_id', $room->case_id),
            ])
            ->orderBy('id')->get()
            ->map(fn (InvestigationRequest $request) => [
                'id' => $request->id,
                'request_type' => $request->request_type->value,
                'title' => $request->gatedLevels->isNotEmpty()
                    ? $request->gatedLevels->pluck('title')->implode(' · ')
                    : implode(' · ', array_filter([
                        $request->unlockedLevel?->title,
                        $request->unlockedEvidence?->title,
                    ], fn (?string $title) => $title !== null && $title !== '')),
            ])->all();
    }

    private function discoveredLevels(Builder $levels, GameRoom $room): Builder
    {
        return $levels->whereHas('zone', fn (Builder $zones) => $zones->where('case_id', $room->case_id))
            ->where(fn (Builder $levels) => $levels->where('is_initial', true)
                ->orWhereIn('levels.id', $room->unlockedLevels()->select('levels.id')));
    }

    private function eligibleRequestsQuery(GameRoom $room): Builder
    {
        return InvestigationRequest::query()->where('case_id', $room->case_id)
            ->where(fn (Builder $requests) => $requests
                ->whereDoesntHave('gatedLevels', fn (Builder $levels) => $levels
                    ->whereHas('zone', fn (Builder $zones) => $zones->where('case_id', $room->case_id)))
                ->orWhereHas('gatedLevels', fn (Builder $levels) => $this->discoveredLevels($levels, $room)));
    }

    public function processRequest(GameRoom $room, int $requestId, array $submittedEvidenceIds = [], array $submittedCharacterIds = []): Result
    {
        return DB::transaction(function () use ($room, $requestId, $submittedEvidenceIds, $submittedCharacterIds) {
            $room = GameRoom::where('id', $room->id)->lockForUpdate()->firstOrFail();

            if ($room->status !== RoomStatus::Active) {
                return Result::failure('This investigation has already concluded.');
            }

            $submittedEvidenceIds = $this->normalizeIds($submittedEvidenceIds);
            $submittedCharacterIds = $this->normalizeIds($submittedCharacterIds);

            if (! InvestigationRequest::hasMinimumItems(count($submittedEvidenceIds), count($submittedCharacterIds))) {
                return Result::failure(InvestigationRequest::MIN_ITEMS_MESSAGE);
            }

            $request = $this->eligibleRequestsQuery($room)
                ->with(['requiredEvidences:evidences.id', 'requiredCharacters:characters.id'])->whereKey($requestId)->first();

            if (! $request) {
                return Result::failure('This procedural request is unavailable.');
            }

            if ($room->completedRequests()->where('request_id', $request->id)->exists()) {
                return Result::failure("This {$request->request_type->label()} has already been executed.");
            }

            $signature = hash('sha256', 'R:'.$request->id.'|'.$this->computeSignature($submittedEvidenceIds, $submittedCharacterIds));

            // Evidence possession: single source of truth is the room's runtime pivot state.
            $possessedEvidences = $room->getPossessedEvidenceIds();

            if (array_diff($submittedEvidenceIds, $possessedEvidences)) {
                return Result::failure('Unauthorized: You cannot file a request using evidence you have not yet discovered.');
            }

            // Character possession: single source of truth is the room's runtime pivot state.
            $possessedCharacters = $room->getUnlockedCharacterIds();

            if (array_diff($submittedCharacterIds, $possessedCharacters)) {
                return Result::failure('Unauthorized: You cannot file a request using a character you have not yet discovered.');
            }

            if (! $request->unlocks_evidence_id && ! $request->unlocks_level_id) {
                return Result::failure('The DA rejected your request. This combination does not lead to any new lead.');
            }

            $requiredEvidenceIds = $this->normalizeIds($request->requiredEvidences->pluck('id')->all());
            $requiredCharacterIds = $this->normalizeIds($request->requiredCharacters->pluck('id')->all());
            if ($requiredEvidenceIds !== $submittedEvidenceIds || $requiredCharacterIds !== $submittedCharacterIds) {
                $hasUnrelatedExtras = empty(array_diff($requiredEvidenceIds, $submittedEvidenceIds))
                    && empty(array_diff($requiredCharacterIds, $submittedCharacterIds));
                $trust = app(AssessmentService::class)->deductManagementTrust($room, 5, 'request');

                return Result::success([
                    'status' => $trust['management_trust'] === 0 ? 'failed_final' : 'rejected',
                    'reason' => $hasUnrelatedExtras ? 'extras' : 'mismatch',
                    'message' => $hasUnrelatedExtras
                        ? 'Your request contains unnecessary items. Narrow your selection to directly connected evidence and characters.'
                        : 'The DA rejected your request. The provided items do not establish sufficient grounds.',
                ] + $trust);
            }

            $room->completedRequests()->syncWithoutDetaching([$request->id]);

            // ItemsUnlocked requires Eloquent collections (typed event contract)
            $unlockedEvidences = new EloquentCollection;
            $unlockedLevels = new EloquentCollection;

            // Unlocks are resolved strictly inside the room's case (E-38): a
            // mis-wired or cross-case target must fail silently instead of
            // leaking another case's evidence or level.
            if ($request->unlocks_evidence_id) {
                $evidence = Evidence::where('case_id', $room->case_id)
                    ->where('id', $request->unlocks_evidence_id)
                    ->first();

                if ($evidence) {
                    $room->unlockedEvidences()->syncWithoutDetaching([$evidence->id]);
                    $evidence->makeHidden(['is_vital_for_conviction']);
                    $unlockedEvidences->push($evidence);
                }
            }

            if ($request->unlocks_level_id) {
                $level = Level::whereHas('zone', fn ($zone) => $zone->where('case_id', $room->case_id))
                    ->where('id', $request->unlocks_level_id)
                    ->first();

                if ($level) {
                    $room->unlockedLevels()->syncWithoutDetaching([$level->id]);
                    $unlockedLevels->push($level);
                }
            }

            if ($unlockedEvidences->isNotEmpty() || $unlockedLevels->isNotEmpty()) {
                $this->broadcastAfterCommit(new ItemsUnlocked($room, $unlockedEvidences->isNotEmpty() ? $unlockedEvidences : null, $unlockedLevels->isNotEmpty() ? $unlockedLevels : null));
            }

            // LOG THE PERMANENT HISTORY & BROADCAST
            $filedRecord = $room->filedRequests()->create([
                'request_type' => $request->request_type->value,
                'signature' => $signature,
                'evidence_ids' => $submittedEvidenceIds,
                'character_ids' => $submittedCharacterIds,
            ]);
            $this->broadcastAfterCommit(new RequestFiled($room, $filedRecord, (int) $request->id));

            return Result::success([
                'message' => "{$request->request_type->label()} approved by the DA.",
                'status' => 'success',
                'management_trust' => $room->management_trust,
                'trust_loss' => 0,
                'request_id' => (int) $request->id,
                'unlocked_evidence' => $unlockedEvidences->toArray(),
                'unlocked_levels' => $unlockedLevels->toArray(),
            ]);
        });
    }

    private function computeSignature(array $submittedEvidenceIds, array $submittedCharacterIds): string
    {
        $signaturePayload = 'E:'.implode(',', $submittedEvidenceIds).'|C:'.implode(',', $submittedCharacterIds);

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
