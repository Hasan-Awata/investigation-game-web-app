<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminQuestionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level_id' => 'required|exists:levels,id',
            'text' => 'required|string',
            'msg_when_wrong' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'choices' => 'required|array|min:2',
            'choices.*.text' => 'required|string|max:255',
            'choices.*.is_correct' => 'required|boolean',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('questions', 'public');
            }

            // 1. Create the Question
            $question = Question::create([
                'level_id' => $validated['level_id'],
                'text' => $validated['text'],
                'msg_when_wrong' => $validated['msg_when_wrong'],
                'img_url' => $imagePath ? asset('storage/' . $imagePath) : null,
            ]);

            // 2. Create the associated Choices
            $choicesData = array_map(function ($choice) use ($question) {
                return [
                    'question_id' => $question->id,
                    'text' => $choice['text'],
                    'is_correct' => $choice['is_correct'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }, $validated['choices']);

            $question->choices()->insert($choicesData);

            return response()->json([
                'message' => 'Question and choices created successfully.',
                'question' => $question->load('choices')
            ], 201);
        });
    }
}