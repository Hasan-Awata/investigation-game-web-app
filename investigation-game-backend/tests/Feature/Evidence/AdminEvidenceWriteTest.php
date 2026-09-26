<?php

namespace Tests\Feature\Evidence;

use App\Enums\AssetKind;
use App\Enums\EvidenceType;
use App\Enums\PaperFinish;
use App\Enums\ViewerStrategy;
use App\Models\Evidence;
use App\Models\GameCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminEvidenceWriteTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->forceFill(['is_admin' => true])->save();

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function baseAttributes(GameCase $case, EvidenceType $type): array
    {
        return [
            'case_id' => $case->id,
            'title' => 'Autopsy Report',
            'description' => 'Cause of death.',
            'evidence_type' => $type->value,
            'is_initial' => true,
            'is_vital_for_conviction' => false,
        ];
    }

    /**
     * A real 1x1 PNG, so the writer's getimagesize() measurement has something
     * to read. UploadedFile::fake()->image() would need the GD extension, which
     * this environment does not have.
     */
    private function realImage(string $name = 'scene.png'): UploadedFile
    {
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        );

        $path = tempnam(sys_get_temp_dir(), 'ev').'.png';
        file_put_contents($path, $png);

        return new UploadedFile($path, $name, 'image/png', null, true);
    }

    /**
     * @return array<string, mixed>
     */
    private function minimalPages(): array
    {
        return [
            'pages' => [[
                'id' => 'page-1',
                'blocks' => [[
                    'id' => 'block-1',
                    'type' => 'text',
                    'props' => ['html' => '<p>Body.</p>'],
                ]],
            ]],
        ];
    }

    public function test_it_creates_a_document_with_a_validated_payload(): void
    {
        $case = GameCase::factory()->create();

        $payload = [
            'pages' => [
                [
                    'id' => 'page-1',
                    'blocks' => [
                        [
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => [
                                'html' => '<p>Condemned, <strong>no hesitation</strong>.</p>',
                                'align' => 'left',
                                'size' => 'body',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Forensic) + [
                'content_payload' => $payload,
            ]);

        $response->assertCreated();
        $response->assertJsonPath('evidence.viewer_strategy', ViewerStrategy::Paper->value);
        $response->assertJsonPath('evidence.paper_finish', PaperFinish::Blank->value);
        $response->assertJsonPath('evidence.content_payload.pages.0.blocks.0.props.align', 'left');

        $this->assertDatabaseHas('evidences', [
            'case_id' => $case->id,
            'viewer_strategy' => ViewerStrategy::Paper->value,
        ]);
    }

    public function test_it_fills_in_block_defaults_the_author_omitted(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Document) + [
                'content_payload' => [
                    'pages' => [[
                        'id' => 'page-1',
                        'blocks' => [[
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => ['html' => '<p>Signed.</p>'],
                        ]],
                    ]],
                ],
            ]);

        $response->assertCreated();

        $props = $response->json('evidence.content_payload.pages.0.blocks.0.props');

        $this->assertSame('left', $props['align']);
        $this->assertSame('body', $props['size']);
    }

    public function test_it_rejects_a_bad_block_path_with_a_dotted_message(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Document) + [
                'content_payload' => [
                    'pages' => [[
                        'id' => 'page-1',
                        'blocks' => [[
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => [
                                'html' => '<p>ok</p>',
                                'align' => 'left',
                                'size' => 'body',
                                'colour' => '#ff0000',
                            ],
                        ]],
                    ]],
                ],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('content_payload.pages.0.blocks.0.props.colour');
    }

    public function test_it_strips_scripts_from_a_text_block_instead_of_storing_them(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Document) + [
                'content_payload' => [
                    'pages' => [[
                        'id' => 'page-1',
                        'blocks' => [[
                            'id' => 'block-1',
                            'type' => 'text',
                            'props' => ['html' => '<p>hi</p><script>alert(1)</script>'],
                        ]],
                    ]],
                ],
            ]);

        $response->assertCreated();

        $html = $response->json('evidence.content_payload.pages.0.blocks.0.props.html');

        $this->assertStringNotContainsString('<script', $html);
        $this->assertStringNotContainsString('alert(1)', $html);
        $this->assertStringContainsString('<p>hi</p>', $html);
    }

    public function test_it_rejects_a_strategy_that_cannot_present_the_type(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Document) + [
                'viewer_strategy' => ViewerStrategy::Media->value,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('viewer_strategy');
    }

    public function test_it_rejects_a_paper_finish_on_a_media_evidence(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Image) + [
                'paper_finish' => PaperFinish::Manila->value,
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('paper_finish');
    }

    public function test_media_evidence_rejects_any_payload(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Image) + [
                'content_payload' => ['pages' => []],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('content_payload');
    }

    public function test_ballistics_defaults_to_manila_and_honours_an_override(): void
    {
        $case = GameCase::factory()->create();
        $admin = $this->admin();

        $default = $this->actingAs($admin)->postJson(
            '/api/admin/evidences',
            $this->baseAttributes($case, EvidenceType::Ballistics) + [
                'content_payload' => $this->minimalPages(),
            ]
        );

        $default->assertCreated();
        $default->assertJsonPath('evidence.paper_finish', PaperFinish::Manila->value);

        $override = $this->actingAs($admin)->postJson(
            '/api/admin/evidences',
            $this->baseAttributes($case, EvidenceType::Ballistics) + [
                'paper_finish' => PaperFinish::Blank->value,
                'content_payload' => $this->minimalPages(),
            ]
        );

        $override->assertCreated();
        $override->assertJsonPath('evidence.paper_finish', PaperFinish::Blank->value);
    }

    public function test_a_paper_strategy_refuses_to_save_without_pages(): void
    {
        $case = GameCase::factory()->create();

        $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Document))
            ->assertStatus(422)
            ->assertJsonValidationErrors('content_payload');
    }

    public function test_it_stores_an_image_asset_and_exposes_it_in_the_detail(): void
    {
        Storage::fake('public');

        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->post('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Image) + [
                'image' => $this->realImage(),
            ], ['Accept' => 'application/json']);

        $response->assertCreated();

        $asset = $response->json('evidence.assets.0');

        $this->assertSame(AssetKind::Image->value, $asset['kind']);
        $this->assertSame('image/png', $asset['mime']);
        $this->assertSame(['width' => 1, 'height' => 1], $asset['meta']);
        $this->assertNotNull($asset['url']);

        // The API exposes url/mime/bytes/meta but never the storage layout.
        $this->assertArrayNotHasKey('disk', $asset);
        $this->assertArrayNotHasKey('path', $asset);

        $stored = Evidence::find($response->json('evidence.id'))->assetOfKind(AssetKind::Image);

        $this->assertSame('public', $stored->disk->value);
        $this->assertStringStartsWith('cases/'.$case->id.'/evidences/', $stored->path);

        Storage::disk('public')->assertExists($stored->path);
    }

    public function test_updating_an_image_replaces_the_file_rather_than_adding_a_second_asset(): void
    {
        Storage::fake('public');

        $case = GameCase::factory()->create();
        $admin = $this->admin();

        $created = $this->actingAs($admin)
            ->post('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Image) + [
                'image' => $this->realImage('first.png'),
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('evidence');

        $oldPath = Evidence::find($created['id'])->assetOfKind(AssetKind::Image)->path;

        $updated = $this->actingAs($admin)
            ->put('/api/admin/evidences/'.$created['id'], $this->baseAttributes($case, EvidenceType::Image) + [
                'image' => $this->realImage('second.png'),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('evidence');

        $newPath = Evidence::find($created['id'])->assetOfKind(AssetKind::Image)->path;

        $this->assertCount(1, $updated['assets']);
        $this->assertNotSame($oldPath, $newPath);
        $this->assertSame(1, Evidence::find($created['id'])->assets()->count());

        // The superseded file is unlinked, not orphaned.
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($newPath);
    }

    public function test_remove_image_deletes_the_asset_and_its_file(): void
    {
        Storage::fake('public');

        $case = GameCase::factory()->create();
        $admin = $this->admin();

        $created = $this->actingAs($admin)
            ->post('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Image) + [
                'image' => $this->realImage('gone.png'),
            ], ['Accept' => 'application/json'])
            ->json('evidence');

        $path = Evidence::find($created['id'])->assetOfKind(AssetKind::Image)->path;

        $this->actingAs($admin)
            ->put('/api/admin/evidences/'.$created['id'], $this->baseAttributes($case, EvidenceType::Image) + [
                'remove_image' => true,
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('evidence.assets', []);

        Storage::disk('public')->assertMissing($path);
    }

    public function test_a_3d_upload_is_refused_while_the_feature_is_off(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->post('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Custom) + [
                'model' => UploadedFile::fake()->create('scene.glb', 8),
            ], ['Accept' => 'application/json']);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('model');
    }

    public function test_a_custom_artifact_accepts_sanitised_html(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Custom) + [
                'content_payload' => [
                    'kind' => 'html',
                    'html' => '<h1>Exhibit A</h1><script>alert(1)</script>',
                    'css' => 'h1 { color: red; }',
                ],
            ]);

        $response->assertCreated();
        $response->assertJsonPath('evidence.viewer_strategy', ViewerStrategy::Artifact->value);

        $html = $response->json('evidence.content_payload.html');

        $this->assertStringContainsString('<h1>', $html);
        $this->assertStringNotContainsString('<script', $html);
    }

    public function test_a_custom_artifact_rejects_dangerous_css(): void
    {
        $case = GameCase::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Custom) + [
                'content_payload' => [
                    'kind' => 'html',
                    'html' => '<p>x</p>',
                    'css' => 'body { background: url("http://evil.test/x.png"); }',
                ],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('content_payload.css');
    }

    public function test_it_refuses_to_create_evidence_for_another_case_as_a_non_admin(): void
    {
        $case = GameCase::factory()->create();

        $this->actingAs(User::factory()->create())
            ->postJson('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Document))
            ->assertForbidden();

        $this->assertDatabaseCount('evidences', 0);
    }

    public function test_deleting_evidence_cascades_its_assets(): void
    {
        Storage::fake('public');

        $case = GameCase::factory()->create();
        $admin = $this->admin();

        $created = $this->actingAs($admin)
            ->post('/api/admin/evidences', $this->baseAttributes($case, EvidenceType::Image) + [
                'image' => $this->realImage('doomed.png'),
            ], ['Accept' => 'application/json'])
            ->json('evidence');

        $this->actingAs($admin)
            ->deleteJson('/api/admin/evidences/'.$created['id'])
            ->assertOk();

        $this->assertDatabaseMissing('evidences', ['id' => $created['id']]);
        $this->assertDatabaseMissing('evidence_assets', ['evidence_id' => $created['id']]);
    }
}
