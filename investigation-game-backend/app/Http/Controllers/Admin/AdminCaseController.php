<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\MediaService;
use App\Models\GameCase;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB; 

class AdminCaseController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'story' => 'required|string',
            'min_player_XP' => 'required|integer|min:0',
            'XP_on_solve' => 'required|integer|min:0',
            'max_strikes' => 'required|integer|min:1',
            'rating_stars' => 'required|numeric|min:0|max:5',
            'age_rating' => 'required|string|max:50',
            'estimated_playtime' => 'required|string|max:100',
            'difficulty' => 'required|string|max:50',
            'tags' => 'nullable|string',
            'author_name' => 'required|string|max:100',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'is_published' => 'required|boolean',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);

        $imageUrl = $this->mediaService->store(
            $request->file('image'),
            $validated['title'],
            'Cover',
            $storeLocally
        );

        $tagsArray = $request->filled('tags')
            ? array_map('trim', explode(',', $validated['tags']))
            : [];

        $case = GameCase::create([
            'title' => $validated['title'],
            'story' => $validated['story'],
            'min_player_XP' => $validated['min_player_XP'],
            'XP_on_solve' => $validated['XP_on_solve'],
            'max_strikes' => $validated['max_strikes'],
            'rating_stars' => $validated['rating_stars'],
            'age_rating' => $validated['age_rating'],
            'estimated_playtime' => $validated['estimated_playtime'],
            'difficulty' => $validated['difficulty'],
            'tags' => $tagsArray,
            'author_name' => $validated['author_name'],
            'img_url' => $imageUrl,
            'is_published' => filter_var($request->is_published, FILTER_VALIDATE_BOOLEAN),
        ]);

        return response()->json(['message' => 'Case created successfully.', 'case' => $case], 201);
    }

    public function index(): JsonResponse
    {
        $cases = GameCase::with([
            'evidences',
            'suspects',
            'victims',
            'investigationRequests.requiredEvidences'
        ])
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json(['cases' => $cases], 200);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $case = GameCase::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'story' => 'required|string',
            'min_player_XP' => 'required|integer|min:0',
            'XP_on_solve' => 'required|integer|min:0',
            'max_strikes' => 'required|integer|min:1',
            'rating_stars' => 'required|numeric|min:0|max:5',
            'age_rating' => 'required|string|max:50',
            'estimated_playtime' => 'required|string|max:100',
            'difficulty' => 'required|string|max:50',
            'tags' => 'nullable|string',
            'author_name' => 'required|string|max:100',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:4096',
            'is_published' => 'required|boolean',
            'store_locally' => 'required|boolean',
        ]);

        $storeLocally = filter_var($validated['store_locally'], FILTER_VALIDATE_BOOLEAN);

        if ($request->hasFile('image')) {
            $this->mediaService->delete($case->getRawOriginal('img_url'));

            $case->img_url = $this->mediaService->store(
                $request->file('image'),
                $validated['title'],
                'Cover',
                $storeLocally
            );
        }

        $case->update([
            'title' => $validated['title'],
            'story' => $validated['story'],
            'min_player_XP' => $validated['min_player_XP'],
            'XP_on_solve' => $validated['XP_on_solve'],
            'max_strikes' => $validated['max_strikes'],
            'rating_stars' => $validated['rating_stars'],
            'age_rating' => $validated['age_rating'],
            'estimated_playtime' => $validated['estimated_playtime'],
            'difficulty' => $validated['difficulty'],
            'tags' => $request->filled('tags') ? array_map('trim', explode(',', $validated['tags'])) : [],
            'author_name' => $validated['author_name'],
            'is_published' => filter_var($request->is_published, FILTER_VALIDATE_BOOLEAN),
        ]);

        return response()->json(['message' => 'Case updated successfully.', 'case' => $case], 200);
    }

    public function destroy($id): JsonResponse
    {
        // Eager load all related entities that contain media attachments
        $case = GameCase::with(['levels.questions', 'evidences', 'suspects', 'victims'])->findOrFail($id);

        // 1. Delete Case Cover Image
        $this->mediaService->delete($case->getRawOriginal('img_url'));

        // 2. Delete Evidence Media (Now attached directly to the Case)
        foreach ($case->evidences as $evidence) {
            $this->mediaService->delete($evidence->getRawOriginal('img_url'));
            $this->mediaService->delete($evidence->getRawOriginal('audio_url'));
        }

        // 3. Delete Level and Question Media
        foreach ($case->levels as $level) {
            $this->mediaService->delete($level->getRawOriginal('img_url'));

            foreach ($level->questions as $question) {
                $this->mediaService->delete($question->getRawOriginal('img_url'));
                $this->mediaService->delete($question->getRawOriginal('audio_url'));
            }
        }

        // 4. Delete Suspect Media
        foreach ($case->suspects as $suspect) {
            $this->mediaService->delete($suspect->getRawOriginal('img_url'));
        }

        // 5. Delete Victim Media
        foreach ($case->victims as $victim) {
            $this->mediaService->delete($victim->getRawOriginal('img_url'));
        }

        // Database cascadeOnDelete handles the actual row removals
        $case->delete();

        return response()->json(['message' => 'Case and all associated media completely wiped.'], 200);
    }

    /**
     * Handles the bulk JSON import of an entire case via the Multi-Pass Ref ID strategy.
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_details' => 'required|array',
            'evidences' => 'present|array',
            'suspects' => 'present|array',
            'victims' => 'present|array',
            'investigation_requests' => 'present|array',
            'phases' => 'present|array',
        ]);

        return DB::transaction(function () use ($validated) {
            // PASS 1: Master Case Creation
            $caseData = $validated['case_details'];
            $case = GameCase::create([
                'title' => $caseData['title'],
                'story' => $caseData['story'],
                'min_player_XP' => $caseData['min_player_XP'] ?? 0,
                'XP_on_solve' => $caseData['XP_on_solve'],
                'max_strikes' => $caseData['max_strikes'] ?? 3,
                'rating_stars' => $caseData['rating_stars'] ?? 5.0,
                'age_rating' => $caseData['age_rating'] ?? 'Unrated',
                'estimated_playtime' => $caseData['estimated_playtime'] ?? null,
                'difficulty' => $caseData['difficulty'] ?? 'Standard',
                'tags' => $caseData['tags'] ?? [],
                'author_name' => $caseData['author_name'] ?? 'System Admin',
                'is_published' => $caseData['is_published'] ?? false,
            ]);

            // Dictionaries to map the JSON ref_id strings to the actual database IDs generated
            $refMaps = [
                'evidence' => [],
                'suspect' => [],
                'victim' => [],
                'level' => [],
                'request' => [],
                'choice' => [],
            ];

            // PASS 2: Base Entities (Evidences, Suspects, Victims)
            foreach ($validated['evidences'] as $evData) {
                $evidence = \App\Models\Evidence::create([
                    'case_id' => $case->id,
                    'title' => $evData['title'],
                    'description' => $evData['description'] ?? null,
                    'evidence_type' => $evData['evidence_type'],
                    'sub_type' => $evData['sub_type'] ?? null,
                    'metadata' => $evData['metadata'] ?? null,
                    'is_initial' => $evData['is_initial'] ?? false,
                    'is_vital_for_conviction' => $evData['is_vital_for_conviction'] ?? false,
                ]);
                if (isset($evData['ref_id'])) {
                    $refMaps['evidence'][$evData['ref_id']] = $evidence->id;
                }
            }

            foreach ($validated['suspects'] as $susData) {
                $suspect = \App\Models\Suspect::create([
                    'case_id' => $case->id,
                    'name' => $susData['name'],
                    'background' => $susData['background'] ?? null,
                    'is_initial' => $susData['is_initial'] ?? false,
                    'is_guilty' => $susData['is_guilty'] ?? false,
                ]);
                if (isset($susData['ref_id'])) {
                    $refMaps['suspect'][$susData['ref_id']] = $suspect->id;
                }
            }

            foreach ($validated['victims'] as $vicData) {
                $victim = \App\Models\Victim::create([
                    'case_id' => $case->id,
                    'name' => $vicData['name'],
                    'background' => $vicData['background'] ?? null,
                    'is_initial' => $vicData['is_initial'] ?? true,
                ]);
                if (isset($vicData['ref_id'])) {
                    $refMaps['victim'][$vicData['ref_id']] = $victim->id;
                }
            }

            // PASS 3: Phases and Levels (Ignoring gatekeeper requests for now)
            $levelDataWithRefs = []; // Memory cache to update required_request_id later
            $phasesDataArray = [];   // Memory cache to process questions later

            foreach ($validated['phases'] as $phaseData) {
                $phase = \App\Models\Phase::create([
                    'case_id' => $case->id,
                    'title' => $phaseData['title'],
                    'description' => $phaseData['description'] ?? null,
                    'order_index' => $phaseData['order_index'],
                    'map_url' => $phaseData['map_url'] ?? null,
                    'coord_x' => $phaseData['coord_x'] ?? null,
                    'coord_y' => $phaseData['coord_y'] ?? null,
                ]);

                foreach ($phaseData['levels'] as $lvlData) {
                    $level = \App\Models\Level::create([
                        'phase_id' => $phase->id,
                        'title' => $lvlData['title'],
                        'details' => $lvlData['details'],
                        'order_index' => $lvlData['order_index'],
                        'is_initial' => $lvlData['is_initial'] ?? false,
                        'presentation_type' => $lvlData['presentation_type'],
                        'required_request_id' => null, // Defers mapping to avoid circular logic
                    ]);

                    if (isset($lvlData['ref_id'])) {
                        $refMaps['level'][$lvlData['ref_id']] = $level->id;
                    }
                    
                    $levelDataWithRefs[] = [
                        'level_id' => $level->id,
                        'req_ref' => $lvlData['required_request_ref'] ?? null,
                    ];

                    $phasesDataArray[] = [
                        'level_id' => $level->id,
                        'nodes' => $lvlData['nodes'] ?? []
                    ];
                }
            }

            // PASS 4: Investigation Requests (Mapping unlocks to the levels we just created)
            foreach ($validated['investigation_requests'] as $reqData) {
                $req = \App\Models\InvestigationRequest::create([
                    'case_id' => $case->id,
                    'request_type' => $reqData['request_type'],
                    'unlocks_evidence_id' => isset($reqData['unlocks_evidence_ref']) && isset($refMaps['evidence'][$reqData['unlocks_evidence_ref']]) ? $refMaps['evidence'][$reqData['unlocks_evidence_ref']] : null,
                    'unlocks_level_id' => isset($reqData['unlocks_level_ref']) && isset($refMaps['level'][$reqData['unlocks_level_ref']]) ? $refMaps['level'][$reqData['unlocks_level_ref']] : null,
                ]);
                
                if (isset($reqData['ref_id'])) {
                    $refMaps['request'][$reqData['ref_id']] = $req->id;
                }

                if (!empty($reqData['required_evidence_refs'])) {
                    $evIds = array_map(fn($ref) => $refMaps['evidence'][$ref] ?? null, $reqData['required_evidence_refs']);
                    $req->requiredEvidences()->sync(array_filter($evIds));
                }
            }

            // PASS 5: Update Levels with their required Investigation Requests
            foreach ($levelDataWithRefs as $ldata) {
                if ($ldata['req_ref'] && isset($refMaps['request'][$ldata['req_ref']])) {
                    \App\Models\Level::where('id', $ldata['level_id'])->update([
                        'required_request_id' => $refMaps['request'][$ldata['req_ref']]
                    ]);
                }
            }

            // PASS 6: Questions and Choices
            foreach ($phasesDataArray as $ldata) {
                $nodeIndexMap = []; // Maps JSON node array index to actual question DB ID

                // Sub-Pass A: Insert Questions First (to generate IDs for dialogue trees)
                foreach ($ldata['nodes'] as $index => $nodeData) {
                    $question = \App\Models\Question::create([
                        'level_id' => $ldata['level_id'],
                        'text' => $nodeData['text'],
                    ]);
                    $nodeIndexMap[$index] = $question->id;
                }

                // Sub-Pass B: Insert Choices and connect internal routing
                foreach ($ldata['nodes'] as $index => $nodeData) {
                    $questionId = $nodeIndexMap[$index];

                    foreach ($nodeData['choices'] as $choiceData) {
                        $outcomes = $choiceData['outcomes'] ?? [];
                        $requirements = $choiceData['requirements'] ?? [];

                        // Build Outcomes Array
                        $mappedOutcomes = [];
                        if (isset($outcomes['feedback'])) $mappedOutcomes['feedback'] = $outcomes['feedback'];
                        if (isset($outcomes['gives_strike'])) $mappedOutcomes['gives_strike'] = $outcomes['gives_strike'];
                        if (isset($outcomes['next_question_index']) && $outcomes['next_question_index'] !== null) {
                            $mappedOutcomes['next_question_id'] = $nodeIndexMap[$outcomes['next_question_index']] ?? null;
                        }

                        $mapRefs = function($refs, $type) use ($refMaps) {
                            if (!is_array($refs)) return [];
                            return array_values(array_filter(array_map(fn($r) => $refMaps[$type][$r] ?? null, $refs)));
                        };

                        if (!empty($outcomes['unlock_evidence_refs'])) $mappedOutcomes['unlock_evidence'] = $mapRefs($outcomes['unlock_evidence_refs'], 'evidence');
                        if (!empty($outcomes['unlock_suspect_refs'])) $mappedOutcomes['unlock_suspects'] = $mapRefs($outcomes['unlock_suspect_refs'], 'suspect');
                        if (!empty($outcomes['unlock_victims_refs'])) $mappedOutcomes['unlock_victims'] = $mapRefs($outcomes['unlock_victims_refs'], 'victim');
                        if (!empty($outcomes['unlock_levels_refs'])) $mappedOutcomes['unlock_levels'] = $mapRefs($outcomes['unlock_levels_refs'], 'level');

                        // Build Requirements Array
                        $mappedReqs = [];
                        if (!empty($requirements['required_evidence_refs'])) {
                            $mappedReqs['required_evidence'] = $mapRefs($requirements['required_evidence_refs'], 'evidence');
                        }
                        if (!empty($requirements['required_choice_refs'])) {
                            $mappedReqs['required_choices'] = $mapRefs($requirements['required_choice_refs'], 'choice');
                        }

                        // Create choice so Eloquent arrays are casted to JSON properly and we retrieve the auto-increment ID
                        $choice = \App\Models\Choice::create([
                            'question_id' => $questionId,
                            'text' => $choiceData['text'],
                            'outcomes' => !empty($mappedOutcomes) ? $mappedOutcomes : null,
                            'requirements' => !empty($mappedReqs) ? $mappedReqs : null,
                        ]);

                        if (isset($choiceData['ref_id'])) {
                            $refMaps['choice'][$choiceData['ref_id']] = $choice->id;
                        }
                    }
                }
            }

            return response()->json([
                'message' => 'Bulk Case Import Successful.',
                'case_id' => $case->id,
            ], 201);
        });
    }
}