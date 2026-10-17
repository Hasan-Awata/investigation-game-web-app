<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreQuestionRequest;
use App\Http\Requests\Admin\UpdateQuestionRequest;
use App\Models\Level;
use App\Models\Question;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminQuestionController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(StoreQuestionRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $caseTitle = $this->caseTitleFor($validated['level_id']);
        $caseId = $this->caseIdFor($validated['level_id']);
        $subfolder = $this->subfolderFor($validated['level_id']);

        $imageUrl = $this->mediaService->store($request->file('image'), $caseTitle, $subfolder, $storeLocally, $caseId);
        $audioUrl = $this->mediaService->store($request->file('audio'), $caseTitle, $subfolder, $storeLocally, $caseId);

        $question = DB::transaction(function () use ($validated, $imageUrl, $audioUrl, $request) {
            $question = Question::create([
                'level_id' => $validated['level_id'],
                'order_index' => (int) ($validated['order_index'] ?? 0),
                'text' => $validated['text'],
                'img_url' => $imageUrl,
                'audio_url' => $audioUrl,
            ]);

            $this->syncChoices($question, $request->input('choices', []));

            return $question;
        });

        return response()->json([
            'message' => 'Question and choices created successfully.',
            'question' => $question->load('choices'),
        ], 201);
    }

    public function update(UpdateQuestionRequest $request, Question $question): JsonResponse
    {
        $validated = $request->validated();
        $storeLocally = $request->boolean('store_locally');
        $caseTitle = $this->caseTitleFor($validated['level_id']);
        $caseId = $this->caseIdFor($validated['level_id']);
        $subfolder = $this->subfolderFor($validated['level_id']);

        $oldImage = $question->getRawOriginal('img_url');
        $oldAudio = $question->getRawOriginal('audio_url');

        $newImage = $request->hasFile('image')
            ? $this->mediaService->store($request->file('image'), $caseTitle, $subfolder, $storeLocally, $caseId)
            : null;
        $newAudio = $request->hasFile('audio')
            ? $this->mediaService->store($request->file('audio'), $caseTitle, $subfolder, $storeLocally, $caseId)
            : null;

        $updateData = [
            'level_id' => $validated['level_id'],
            'text' => $validated['text'],
        ];

        if (array_key_exists('order_index', $validated)) {
            $updateData['order_index'] = (int) ($validated['order_index'] ?? 0);
        }

        if ($newImage !== null) {
            $updateData['img_url'] = $newImage;
        }

        if ($newAudio !== null) {
            $updateData['audio_url'] = $newAudio;
        }

        DB::transaction(function () use ($question, $updateData, $request) {
            $question->update($updateData);
            $this->syncChoices($question, $request->input('choices', []));
        });

        if ($newImage !== null && $newImage !== $oldImage) {
            $this->mediaService->delete($oldImage);
        }

        if ($newAudio !== null && $newAudio !== $oldAudio) {
            $this->mediaService->delete($oldAudio);
        }

        return response()->json(['message' => 'Question updated.', 'question' => $question->load('choices')], 200);
    }

    public function destroy(Question $question): JsonResponse
    {
        $image = $question->getRawOriginal('img_url');
        $audio = $question->getRawOriginal('audio_url');

        DB::transaction(fn () => $question->delete());

        $this->mediaService->delete($image);
        $this->mediaService->delete($audio);

        return response()->json(['message' => 'Question deleted.'], 200);
    }

    /**
     * Reconcile a question's choices by id: update rows that still exist, create
     * new ones, and delete the ones that were removed. Choice ids are preserved
     * so `requirements.required_choices` references never dangle.
     *
     * @param  array<int, array<string, mixed>>  $choices
     */
    private function syncChoices(Question $question, array $choices): void
    {
        $existing = $question->choices()->get()->keyBy('id');
        $keptIds = [];

        foreach ($choices as $choiceData) {
            $id = isset($choiceData['id']) ? (int) $choiceData['id'] : null;

            $attributes = [
                'text' => $choiceData['text'],
                'outcomes' => ! empty($choiceData['outcomes']) ? $choiceData['outcomes'] : null,
                'requirements' => ! empty($choiceData['requirements']) ? $choiceData['requirements'] : null,
            ];

            if ($id !== null && $existing->has($id)) {
                $existing->get($id)->update($attributes);
                $keptIds[] = $id;
            } else {
                $keptIds[] = $question->choices()->create($attributes)->id;
            }
        }

        $existing->keys()->diff($keptIds)->each(function ($removedId) use ($existing) {
            $existing->get($removedId)->delete();
        });
    }

    private function caseTitleFor(int $levelId): string
    {
        return Level::with('zone.gameCase')->find($levelId)?->zone?->gameCase?->title ?? 'General';
    }

    private function caseIdFor(int $levelId): ?int
    {
        return Level::with('zone.gameCase')->find($levelId)?->zone?->gameCase?->id;
    }

    private function subfolderFor(int $levelId): string
    {
        $levelTitle = Level::whereKey($levelId)->value('title') ?? 'General-Level';

        return 'Levels/'.Str::slug($levelTitle).'/Questions';
    }
}
