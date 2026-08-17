<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Traits\HandlesMedia;
use App\Models\Question;
use App\Models\Level;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminQuestionController extends Controller
{
    use HandlesMedia;

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level_id' => 'required|exists:levels,id',
            'text' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240', 
            'choices' => 'nullable|array',
            'choices.*.text' => 'required|string|max:255',
            'choices.*.outcomes' => 'nullable|array',
            'choices.*.requirements' => 'nullable|array', 
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);

        $level = Level::with('phase.gameCase')->find($validated['level_id']);
        $caseTitle = $level?->phase?->gameCase?->title ?? 'General';
        $levelTitle = $level?->title ?? 'General-Level';
        $subfolder = 'Levels/' . \Illuminate\Support\Str::slug($levelTitle) . '/Questions';

        $imageUrl = $this->storeMedia($request->file('image'), $caseTitle, $subfolder, $storeLocally);
        $audioUrl = $this->storeMedia($request->file('audio'), $caseTitle, $subfolder, $storeLocally);

        return DB::transaction(function () use ($validated, $request, $imageUrl, $audioUrl) {
            $question = Question::create([
                'level_id' => $validated['level_id'],
                'text' => $validated['text'],
                'img_url' => $imageUrl,
                'audio_url' => $audioUrl, 
            ]);

            // Safely retrieve choices, falling back to an empty array if completely omitted
            $choices = $request->input('choices', []);

            // Only attempt to map and insert if choices actually exist
            if (!empty($choices)) {
                $choicesData = array_map(function ($choice) use ($question) {
                    return [
                        'question_id' => $question->id,
                        'text' => $choice['text'],
                        'outcomes' => isset($choice['outcomes']) ? json_encode($choice['outcomes']) : null,
                        'requirements' => isset($choice['requirements']) ? json_encode($choice['requirements']) : null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }, $choices);

                $question->choices()->insert($choicesData);
            }

            return response()->json([
                'message' => 'Question and choices created successfully.',
                'question' => $question->load('choices')
            ], 201);
        });
    }

    public function update(Request $request, $id): JsonResponse
    {
        $question = Question::findOrFail($id);

        $validated = $request->validate([
            'level_id' => 'required|exists:levels,id',
            'text' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240', 
            'choices' => 'nullable|array',
            'choices.*.text' => 'required|string|max:255',
            'choices.*.outcomes' => 'nullable|array',
            'choices.*.requirements' => 'nullable|array', 
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);
        $caseTitle = Level::with('phase.gameCase')->where('id', $validated['level_id'])->first()?->phase?->gameCase?->title ?? 'General';

        $updateData = [
            'level_id' => $validated['level_id'],
            'text' => $validated['text'],
        ];

        if ($request->hasFile('image')) {
            $this->deleteMedia($question->getRawOriginal('img_url')); 
            $updateData['img_url'] = $this->storeMedia($request->file('image'), $caseTitle, 'Levels/Questions', $storeLocally);
        }

        if ($request->hasFile('audio')) {
            $this->deleteMedia($question->getRawOriginal('audio_url')); 
            $updateData['audio_url'] = $this->storeMedia($request->file('audio'), $caseTitle, 'Levels/Questions', $storeLocally);
        }

        return DB::transaction(function () use ($question, $validated, $request, $updateData) {
            $question->update($updateData);
            
            // Delete old choices unconditionally
            $question->choices()->delete();

            // Safely retrieve choices, falling back to an empty array
            $choices = $request->input('choices', []);

            // Only attempt to map and insert if choices actually exist
            if (!empty($choices)) {
                $choicesData = array_map(function ($choice) use ($question) {
                    return [
                        'question_id' => $question->id,
                        'text' => $choice['text'],
                        'outcomes' => isset($choice['outcomes']) ? json_encode($choice['outcomes']) : null,
                        'requirements' => isset($choice['requirements']) ? json_encode($choice['requirements']) : null, 
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }, $choices);

                $question->choices()->insert($choicesData);
            }

            return response()->json(['message' => 'Question updated.', 'question' => $question->load('choices')], 200);
        });
    }

    public function destroy($id): JsonResponse
    {
        $question = Question::findOrFail($id);
        
        $this->deleteMedia($question->getRawOriginal('img_url'));
        $this->deleteMedia($question->getRawOriginal('audio_url'));
        
        $question->delete();

        return response()->json(['message' => 'Question deleted.'], 200);
    }
}