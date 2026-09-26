<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AssetKind;
use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Http\Controllers\Controller;
use App\Http\Resources\EvidenceDetailResource;
use App\Models\Evidence;
use App\Services\Evidence\BlockCatalog;
use App\Services\Evidence\ContentPayloadValidator;
use App\Services\Evidence\EvidenceAssetWriter;
use App\Services\Evidence\PresentationResolver;
use App\Services\Evidence\SignatureCatalog;
use App\Services\Evidence\ViewerStrategyLegality;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class AdminEvidenceController extends Controller
{
    public function __construct(
        private readonly BlockCatalog $blockCatalog,
        private readonly SignatureCatalog $signatureCatalog,
        private readonly ContentPayloadValidator $payloadValidator,
        private readonly PresentationResolver $resolver,
        private readonly ViewerStrategyLegality $legality,
        private readonly EvidenceAssetWriter $assetWriter,
    ) {}

    /**
     * The block editor's schema, straight from the same BlockCatalog the
     * validator enforces. The frontend holds no copy of these definitions, so
     * a block added on the server appears in the editor with no client change.
     */
    public function schema(): JsonResponse
    {
        return response()->json([
            'blocks' => $this->blockCatalog->schema(),
            'paper' => [
                'width' => (int) config('evidence.paper.width'),
                'height' => (int) config('evidence.paper.height'),
                'finishes' => array_column(PaperFinish::cases(), 'value'),
            ],
            'strategies' => array_column(ViewerStrategy::cases(), 'value'),
            'types' => array_map(
                static fn (EvidenceType $type): array => [
                    'value' => $type->value,
                    'label' => $type->label(),
                ],
                EvidenceType::cases()
            ),
            'model_3d_enabled' => (bool) config('evidence.features.model_3d'),
            'strategy_rules' => $this->strategyRules(),
        ]);
    }

    /**
     * The per-type presentation rules, served rather than duplicated.
     *
     * The admin form has to offer only legal strategies, and a client-side copy
     * of this matrix would be a second source of truth that silently rots the
     * next time a type is added or re-scoped. Reading it from the same legality
     * service the model hook validates against is the only way the picker and
     * the write-time check can be guaranteed to agree.
     */
    private function strategyRules(): array
    {
        $rules = [];

        foreach (EvidenceType::cases() as $type) {
            $allowed = $this->legality->allowedStrategies($type);

            $rules[$type->value] = [
                'strategies' => array_map(
                    static fn (ViewerStrategy $strategy): string => $strategy->value,
                    $allowed
                ),
                'default_strategy' => $allowed === [] ? null : $allowed[0]->value,
                'default_finish' => $this->legality->defaultFinish($type)->value,
                'is_paged' => $allowed !== [] && $this->legality->requiresPages($allowed[0]),
            ];
        }

        return $rules;
    }

    public function signatures(): JsonResponse
    {
        return response()->json([
            'signatures' => $this->signatureCatalog->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $type = $this->typeFromRequest($request, 'evidence_type');
        $strategy = $this->strategyFromRequest($request, 'viewer_strategy', $type);
        $finish = $this->finishFromRequest($request, 'paper_finish', $type, $strategy);

        $validated = $request->validate([
            'case_id' => 'required|integer|exists:cases,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:'.config('evidence.limits.max_description_bytes'),
            'is_initial' => 'required|boolean',
            'is_vital_for_conviction' => 'required|boolean',
            'order_index' => 'nullable|integer|min:0',
            'image' => 'nullable|file',
            'audio' => 'nullable|file',
            'model' => 'nullable|file',
        ]);

        $evidence = Evidence::create([
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $type,
            'viewer_strategy' => $strategy,
            'paper_finish' => $finish,
            'is_initial' => filter_var($validated['is_initial'], FILTER_VALIDATE_BOOLEAN),
            'is_vital_for_conviction' => filter_var($validated['is_vital_for_conviction'], FILTER_VALIDATE_BOOLEAN),
            'order_index' => $validated['order_index'] ?? 0,
            'content_payload' => null,
        ]);

        $this->writePayload($request, $evidence);
        $this->writeAssets($request, $evidence);

        return response()->json([
            'message' => 'Evidence added successfully.',
            'evidence' => new EvidenceDetailResource($evidence->refresh()->load('assets')),
        ], 201);
    }

    public function update(Request $request, Evidence $evidence): JsonResponse
    {
        $type = $this->typeFromRequest($request, 'evidence_type');
        $strategy = $this->strategyFromRequest($request, 'viewer_strategy', $type);
        $finish = $this->finishFromRequest($request, 'paper_finish', $type, $strategy);

        $validated = $request->validate([
            'case_id' => 'required|integer|exists:cases,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:'.config('evidence.limits.max_description_bytes'),
            'is_initial' => 'required|boolean',
            'is_vital_for_conviction' => 'required|boolean',
            'order_index' => 'nullable|integer|min:0',
            'image' => 'nullable|file',
            'audio' => 'nullable|file',
            'model' => 'nullable|file',
            'remove_image' => 'nullable|boolean',
            'remove_audio' => 'nullable|boolean',
            'remove_model' => 'nullable|boolean',
        ]);

        $evidence->fill([
            'case_id' => $validated['case_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'evidence_type' => $type,
            'viewer_strategy' => $strategy,
            'paper_finish' => $finish,
            'is_initial' => filter_var($validated['is_initial'], FILTER_VALIDATE_BOOLEAN),
            'is_vital_for_conviction' => filter_var($validated['is_vital_for_conviction'], FILTER_VALIDATE_BOOLEAN),
            'order_index' => $validated['order_index'] ?? $evidence->order_index,
        ]);

        // Strategy and finish are resolved before the payload is validated, so
        // a change of strategy cannot leave a payload the viewer cannot render.
        $evidence->save();

        $this->writePayload($request, $evidence);
        $this->removeAssets($request, $evidence);
        $this->writeAssets($request, $evidence);

        return response()->json([
            'message' => 'Evidence updated successfully.',
            'evidence' => new EvidenceDetailResource($evidence->refresh()->load('assets')),
        ], 200);
    }

    public function destroy(Evidence $evidence): JsonResponse
    {
        // Asset rows cascade; the backing files do not, so unlink each first.
        foreach ($evidence->assets as $asset) {
            $this->assetWriter->delete($evidence, $asset->kind);
        }

        $evidence->delete();

        return response()->json(['message' => 'Evidence deleted.'], 200);
    }

    /**
     * Persists the authored payload after normalising and validating it.
     *
     * Media strategies have no payload, so an absent key clears the document
     * rather than leaving a stale one attached to a repointed evidence.
     */
    private function writePayload(Request $request, Evidence $evidence): void
    {
        $type = $evidence->evidence_type;
        $strategy = $evidence->viewer_strategy;

        $raw = $request->input('content_payload');

        if ($raw === null || $raw === '') {
            $payload = null;
        } elseif (is_string($raw)) {
            $payload = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        } else {
            $payload = $raw;
        }

        $validated = $this->payloadValidator->validate($type, $strategy, $payload);

        $evidence->content_payload = $validated;
        $evidence->save();
    }

    private function writeAssets(Request $request, Evidence $evidence): void
    {
        $fields = [
            'image' => AssetKind::Image,
            'audio' => AssetKind::Audio,
            'model' => AssetKind::Model3d,
        ];

        foreach ($fields as $field => $kind) {
            $file = $request->file($field);

            if ($file === null) {
                continue;
            }

            $this->assertUploadAllowed($file, $kind);
            $this->assetWriter->replace($evidence, $kind, $file);
        }
    }

    private function removeAssets(Request $request, Evidence $evidence): void
    {
        $fields = [
            'remove_image' => AssetKind::Image,
            'remove_audio' => AssetKind::Audio,
            'remove_model' => AssetKind::Model3d,
        ];

        foreach ($fields as $field => $kind) {
            if (filter_var($request->input($field, false), FILTER_VALIDATE_BOOLEAN)) {
                $this->assetWriter->delete($evidence, $kind);
            }
        }
    }

    /**
     * Uploads are validated here rather than in request->validate() because the
     * accepted extensions depend on the asset kind and the 3D flag, neither of
     * which is a static rule.
     */
    private function assertUploadAllowed(UploadedFile $file, AssetKind $kind): void
    {
        if ($kind === AssetKind::Model3d && ! config('evidence.features.model_3d')) {
            throw ValidationException::withMessages([
                'model' => '3D evidence is not enabled on this server.',
            ]);
        }

        $allowed = $this->assetWriter->allowedExtensions($kind);

        if (! in_array(strtolower((string) $file->getClientOriginalExtension()), $allowed, true)) {
            throw ValidationException::withMessages([
                'model' => 'Unsupported file. Allowed: '.implode(', ', $allowed).'.',
            ]);
        }
    }

    private function typeFromRequest(Request $request, string $key): EvidenceType
    {
        return $this->enumOrFail($request, $key, EvidenceType::class, 'evidence_type');
    }

    private function strategyFromRequest(Request $request, string $key, EvidenceType $type): ViewerStrategy
    {
        $requested = $this->optionalEnum($request, $key, ViewerStrategy::class);

        // A requested-but-illegal strategy is an authoring error, not something
        // to silently paper over with the default.
        if ($requested !== null && ! $this->legality->isLegal($type, $requested)) {
            throw ValidationException::withMessages([
                $key => "Strategy '{$requested->value}' cannot present a {$type->value}.",
            ]);
        }

        return $this->resolver->resolveStrategy($type, $requested);
    }

    private function finishFromRequest(
        Request $request,
        string $key,
        EvidenceType $type,
        ViewerStrategy $strategy,
    ): ?PaperFinish {
        $requested = $this->optionalEnum($request, $key, PaperFinish::class);

        if ($requested !== null && ! $this->legality->isLegalFinish($strategy, $requested)) {
            throw ValidationException::withMessages([
                $key => "Finish '{$requested->value}' is not valid for a {$strategy->value} presentation.",
            ]);
        }

        return $this->resolver->resolveFinish($type, $strategy, $requested);
    }

    private function optionalEnum(Request $request, string $key, string $enumClass): ?object
    {
        $value = $request->input($key);

        if ($value === null || $value === '') {
            return null;
        }

        $case = $enumClass::tryFrom((string) $value);

        if ($case === null) {
            throw ValidationException::withMessages([
                $key => "Unsupported value '{$value}'.",
            ]);
        }

        return $case;
    }

    private function enumOrFail(Request $request, string $key, string $enumClass, string $errorKey): object
    {
        return $this->optionalEnum($request, $key, $enumClass)
            ?? throw ValidationException::withMessages([
                $errorKey => "The {$errorKey} field is required.",
            ]);
    }
}
