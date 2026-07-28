<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Cloudinary\Cloudinary;

class AdminQuestionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level_id' => 'required|exists:levels,id',
            'text' => 'required|string',
            'msg_when_wrong' => 'nullable|string',
            'is_mandatory' => 'required|boolean', 
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'choices' => 'required|array|min:2',
            'choices.*.text' => 'required|string|max:255',
            'choices.*.is_correct' => 'required|boolean',
            'choices.*.unlocks_evidence_id' => 'nullable|exists:evidences,id', 
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $cloudinary = new \Cloudinary\Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'questions'
            ]);
            $imageUrl = $upload['secure_url'];
        }

        return DB::transaction(function () use ($validated, $imageUrl) {
            // 1. Create the Question
            $question = Question::create([
                'level_id' => $validated['level_id'],
                'text' => $validated['text'],
                'msg_when_wrong' => $validated['msg_when_wrong'],
                'is_mandatory' => $validated['is_mandatory'], // Save flag
                'img_url' => $imageUrl,
            ]);

            // 2. Create the associated Choices
            $choicesData = array_map(function ($choice) use ($question) {
                return [
                    'question_id' => $question->id,
                    'text' => $choice['text'],
                    'is_correct' => $choice['is_correct'],
                    'unlocks_evidence_id' => $choice['unlocks_evidence_id'] ?? null, // Save evidence link
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