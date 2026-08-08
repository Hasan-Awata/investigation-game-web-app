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
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240', 
            'choices' => 'required|array|min:2',
            'choices.*.text' => 'required|string|max:255',
            'choices.*.is_correct' => 'required|boolean',
            'choices.*.unlocks_evidence_id' => 'nullable|exists:evidences,id',
            'choices.*.unlocks_level_id' => 'nullable|exists:levels,id', 
        ]);

        $cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key'    => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => ['secure' => true]
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                'folder' => 'questions'
            ]);
            $imageUrl = $upload['secure_url'];
        }

        $audioUrl = null;
        if ($request->hasFile('audio')) {
            $upload = $cloudinary->uploadApi()->upload($request->file('audio')->getRealPath(), [
                'folder' => 'questions/audio',
                'resource_type' => 'video' 
            ]);
            $audioUrl = $upload['secure_url'];
        }

        return DB::transaction(function () use ($validated, $imageUrl, $audioUrl) {
            $question = Question::create([
                'level_id' => $validated['level_id'],
                'text' => $validated['text'],
                'msg_when_wrong' => $validated['msg_when_wrong'],
                'is_mandatory' => $validated['is_mandatory'],
                'img_url' => $imageUrl,
                'audio_url' => $audioUrl, 
            ]);

            $choicesData = array_map(function ($choice) use ($question) {
                return [
                    'question_id' => $question->id,
                    'text' => $choice['text'],
                    'is_correct' => filter_var($choice['is_correct'], FILTER_VALIDATE_BOOLEAN),
                    'unlocks_evidence_id' => $choice['unlocks_evidence_id'] ?? null,
                    'unlocks_level_id' => $choice['unlocks_level_id'] ?? null,
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

    public function update(Request $request, $id): JsonResponse
    {
        $question = Question::findOrFail($id);

        $validated = $request->validate([
            'level_id' => 'required|exists:levels,id',
            'text' => 'required|string',
            'msg_when_wrong' => 'nullable|string',
            'is_mandatory' => 'required|boolean', 
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'audio' => 'nullable|file|mimes:mp3,wav,ogg|max:10240', 
            'choices' => 'required|array|min:2',
            'choices.*.text' => 'required|string|max:255',
            'choices.*.is_correct' => 'required|boolean',
            'choices.*.unlocks_evidence_id' => 'nullable|exists:evidences,id', 
            'choices.*.unlocks_level_id' => 'nullable|exists:levels,id', 
        ]);

        if ($request->hasFile('image') || $request->hasFile('audio')) {
            $cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                    'api_key'    => env('CLOUDINARY_API_KEY'),
                    'api_secret' => env('CLOUDINARY_API_SECRET'),
                ],
                'url' => ['secure' => true]
            ]);

            if ($request->hasFile('image')) {
                $this->deleteCloudinaryMedia($question->img_url); 
                
                $upload = $cloudinary->uploadApi()->upload($request->file('image')->getRealPath(), [
                    'folder' => 'questions'
                ]);
                $validated['img_url'] = $upload['secure_url'];
            }

            if ($request->hasFile('audio')) {
                $this->deleteCloudinaryMedia($question->audio_url); 
                
                $upload = $cloudinary->uploadApi()->upload($request->file('audio')->getRealPath(), [
                    'folder' => 'questions/audio',
                    'resource_type' => 'video' 
                ]);
                $validated['audio_url'] = $upload['secure_url'];
            }
        }

        return DB::transaction(function () use ($question, $validated) {
            $question->update([
                'level_id' => $validated['level_id'],
                'text' => $validated['text'],
                'msg_when_wrong' => $validated['msg_when_wrong'],
                'is_mandatory' => $validated['is_mandatory'],
                'img_url' => $validated['img_url'] ?? $question->img_url,
                'audio_url' => $validated['audio_url'] ?? $question->audio_url, 
            ]);

            $question->choices()->delete();

            $choicesData = array_map(function ($choice) use ($question) {
                return [
                    'question_id' => $question->id,
                    'text' => $choice['text'],
                    'is_correct' => filter_var($choice['is_correct'], FILTER_VALIDATE_BOOLEAN),
                    'unlocks_evidence_id' => $choice['unlocks_evidence_id'] ?? null,
                    'unlocks_level_id' => $choice['unlocks_level_id'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }, $validated['choices']);

            $question->choices()->insert($choicesData);

            return response()->json(['message' => 'Question updated.', 'question' => $question->load('choices')], 200);
        });
    }

    public function destroy($id): JsonResponse
    {
        $question = Question::findOrFail($id);
        
        $this->deleteCloudinaryMedia($question->img_url);
        $this->deleteCloudinaryMedia($question->audio_url);
        
        $question->delete();

        return response()->json(['message' => 'Question deleted.'], 200);
    }

    private function deleteCloudinaryMedia(?string $url): void
    {
        if (!$url) return;
        if (preg_match('/upload\/(?:v\d+\/)?([^\.]+)/', $url, $matches)) {
            $cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => env('CLOUDINARY_CLOUD_NAME'), 
                    'api_key' => env('CLOUDINARY_API_KEY'), 
                    'api_secret' => env('CLOUDINARY_API_SECRET')
                ], 
                'url' => ['secure' => true]
            ]);
            try { 
                $cloudinary->uploadApi()->destroy($matches[1], [
                    'resource_type' => str_contains($url, '/video/') ? 'video' : 'image'
                ]); 
            } catch (\Exception $e) {}
        }
    }
}