<?php

namespace Tests\Unit\Evidence;

use App\Enums\EvidenceType;
use App\Enums\ViewerStrategy;
use App\Services\Evidence\ContentPayloadValidator;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ContentPayloadValidatorTest extends TestCase
{
    private ContentPayloadValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('evidence.features.model_3d', false);

        $this->validator = app(ContentPayloadValidator::class);
    }

    public function test_it_accepts_a_payload_using_every_block(): void
    {
        $payload = [
            'pages' => [
                [
                    'id' => 'page-1',
                    'blocks' => [
                        $this->textBlock('b1', '<p>Autopsy summary</p>'),
                        $this->tableBlock('b2', ['Time', 'Finding'], [['09:12', 'Bruising']]),
                        $this->signatureBlock('b3', 1),
                        $this->stampBlock('b4', 'CONFIDENTIAL'),
                    ],
                ],
            ],
        ];

        $normalized = $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, $payload);

        $this->assertSame(['pages'], array_keys($normalized));
        $this->assertCount(1, $normalized['pages']);
        $this->assertSame(
            ['text', 'table', 'signature', 'stamp'],
            array_column($normalized['pages'][0]['blocks'], 'type')
        );
    }

    public function test_it_fills_in_missing_optional_props_from_the_catalog_defaults(): void
    {
        $payload = ['pages' => [[
            'id' => 'p1',
            'blocks' => [['id' => 'b1', 'type' => 'text', 'props' => ['html' => '<p>Hi</p>']]],
        ]]];

        $normalized = $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, $payload);

        $this->assertSame(
            ['html' => '<p>Hi</p>', 'align' => 'left', 'size' => 'body'],
            $normalized['pages'][0]['blocks'][0]['props']
        );
    }

    public function test_it_sanitizes_text_block_html_on_the_way_in(): void
    {
        $payload = ['pages' => [[
            'id' => 'p1',
            'blocks' => [[
                'id' => 'b1',
                'type' => 'text',
                'props' => ['html' => '<p>safe</p><script>alert(1)</script>', 'align' => 'left', 'size' => 'body'],
            ]],
        ]]];

        $normalized = $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, $payload);

        $html = $normalized['pages'][0]['blocks'][0]['props']['html'];

        $this->assertStringContainsString('<p>safe</p>', $html);
        $this->assertStringNotContainsString('script', $html);
    }

    public function test_a_terminal_log_uses_the_same_paged_shape_as_paper(): void
    {
        $payload = ['pages' => [['id' => 'p1', 'blocks' => []]]];

        $normalized = $this->validator->validate(EvidenceType::Digital, ViewerStrategy::Terminal, $payload);

        $this->assertSame([], $normalized['pages'][0]['blocks']);
    }

    public function test_a_null_payload_is_rejected_for_a_paged_evidence(): void
    {
        $this->assertErrorsFor(
            fn () => $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, null),
            ['content_payload' => 'The content payload must be an object.']
        );
    }

    public function test_an_empty_page_list_is_rejected(): void
    {
        $this->assertErrorsFor(
            fn () => $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, ['pages' => []]),
            ['content_payload.pages' => 'At least one page is required.']
        );
    }

    public function test_page_count_is_capped(): void
    {
        $max = (int) config('evidence.limits.max_pages');
        $pages = [];

        for ($i = 0; $i <= $max; $i++) {
            $pages[] = ['id' => "p{$i}", 'blocks' => []];
        }

        $this->assertErrorsFor(
            fn () => $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, ['pages' => $pages]),
            ['content_payload.pages' => "An evidence may not exceed {$max} pages."]
        );
    }

    public function test_an_unknown_block_type_is_reported_at_its_own_path(): void
    {
        $payload = ['pages' => [[
            'id' => 'p1',
            'blocks' => [['id' => 'b1', 'type' => 'dna_bands', 'props' => []]],
        ]]];

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, $payload)
        );

        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.type', $errors);
        $this->assertStringContainsString('dna_bands', $errors['content_payload.pages.0.blocks.0.type']);
    }

    public function test_an_unknown_prop_is_rejected_rather_than_dropped(): void
    {
        $block = $this->textBlock('b1', '<p>Hi</p>');
        $block['props']['theme'] = 'sticky';

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(
                EvidenceType::Document,
                ViewerStrategy::Paper,
                ['pages' => [['id' => 'p1', 'blocks' => [$block]]]]
            )
        );

        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.props.theme', $errors);
        $this->assertStringContainsString('Unknown property', $errors['content_payload.pages.0.blocks.0.props.theme']);
    }

    public function test_a_bad_table_cell_is_reported_with_its_full_dotted_path(): void
    {
        $block = [
            'id' => 'b2',
            'type' => 'table',
            'props' => [
                'headers' => ['Time', 'Finding'],
                'rows' => [['09:12', 42]],
                'caption' => '',
                'dense' => false,
            ],
        ];

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(
                EvidenceType::Document,
                ViewerStrategy::Paper,
                ['pages' => [['id' => 'p1', 'blocks' => [$block]]]]
            )
        );

        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.props.rows.0.1', $errors);
        $this->assertSame('A cell must be a string.', $errors['content_payload.pages.0.blocks.0.props.rows.0.1']);
    }

    public function test_a_row_with_the_wrong_cell_count_is_rejected(): void
    {
        $block = $this->tableBlock('b2', ['A', 'B', 'C'], [['1', '2']]);

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(
                EvidenceType::Document,
                ViewerStrategy::Paper,
                ['pages' => [['id' => 'p1', 'blocks' => [$block]]]]
            )
        );

        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.props.rows.0', $errors);
        $this->assertStringContainsString('must have 3 cells', $errors['content_payload.pages.0.blocks.0.props.rows.0']);
    }

    public function test_an_out_of_range_stamp_rotation_is_rejected(): void
    {
        $block = $this->stampBlock('b1', 'X');
        $block['props']['rotation'] = 180;

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(
                EvidenceType::Document,
                ViewerStrategy::Paper,
                ['pages' => [['id' => 'p1', 'blocks' => [$block]]]]
            )
        );

        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.props.rotation', $errors);
        $this->assertStringContainsString('may not exceed 45', $errors['content_payload.pages.0.blocks.0.props.rotation']);
    }

    public function test_a_select_outside_its_options_is_rejected(): void
    {
        $block = $this->textBlock('b1', '<p>Hi</p>');
        $block['props']['align'] = 'center-ish';

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(
                EvidenceType::Document,
                ViewerStrategy::Paper,
                ['pages' => [['id' => 'p1', 'blocks' => [$block]]]]
            )
        );

        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.props.align', $errors);
    }

    public function test_a_signature_that_does_not_exist_is_rejected(): void
    {
        $errors = $this->errorsFor(
            fn () => $this->validator->validate(
                EvidenceType::Document,
                ViewerStrategy::Paper,
                ['pages' => [['id' => 'p1', 'blocks' => [$this->signatureBlock('b1', 9999)]]]]
            )
        );

        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.props.signature_id', $errors);
        $this->assertStringContainsString('9999', $errors['content_payload.pages.0.blocks.0.props.signature_id']);
    }

    public function test_duplicate_ids_across_pages_are_rejected(): void
    {
        $errors = $this->errorsFor(
            fn () => $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, [
                'pages' => [
                    ['id' => 'shared', 'blocks' => []],
                    ['id' => 'shared', 'blocks' => []],
                ],
            ])
        );

        $this->assertArrayHasKey('content_payload.pages.1.id', $errors);
        $this->assertStringContainsString('already used', $errors['content_payload.pages.1.id']);
    }

    public function test_media_evidence_must_not_carry_a_payload(): void
    {
        // Null, not []: a media evidence has no payload at all, and the detail
        // contract types the field as null for the media strategy.
        $this->assertNull(
            $this->validator->validate(EvidenceType::Image, ViewerStrategy::Media, null)
        );

        $this->assertNull(
            $this->validator->validate(EvidenceType::Audio, ViewerStrategy::Media, [])
        );

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(
                EvidenceType::Image,
                ViewerStrategy::Media,
                ['pages' => [['id' => 'p1', 'blocks' => []]]]
            )
        );

        $this->assertArrayHasKey('content_payload', $errors);
    }

    public function test_an_html_artifact_is_accepted_and_cleaned(): void
    {
        $normalized = $this->validator->validate(EvidenceType::Custom, ViewerStrategy::Artifact, [
            'kind' => 'html',
            'html' => '<h1>Case 44-B</h1><script>alert(1)</script>',
            'css' => 'h1 { color: #333; }',
        ]);

        $this->assertSame('html', $normalized['kind']);
        $this->assertStringContainsString('<h1>Case 44-B</h1>', $normalized['html']);
        $this->assertStringNotContainsString('script', $normalized['html']);
    }

    public function test_an_artifact_must_declare_its_kind(): void
    {
        $errors = $this->errorsFor(
            fn () => $this->validator->validate(EvidenceType::Custom, ViewerStrategy::Artifact, [
                'html' => '<p>x</p>',
            ])
        );

        $this->assertArrayHasKey('content_payload.kind', $errors);
    }

    public function test_an_artifact_stylesheet_that_fetches_is_rejected(): void
    {
        $errors = $this->errorsFor(
            fn () => $this->validator->validate(EvidenceType::Custom, ViewerStrategy::Artifact, [
                'kind' => 'html',
                'html' => '<p>x</p>',
                'css' => 'body { background: url(https://evil.test/p.png); }',
            ])
        );

        $this->assertArrayHasKey('content_payload.css', $errors);
    }

    public function test_a_model_3d_artifact_is_refused_while_the_flag_is_off(): void
    {
        $errors = $this->errorsFor(
            fn () => $this->validator->validate(EvidenceType::Custom, ViewerStrategy::Artifact, [
                'kind' => 'model_3d',
                'model_asset_id' => 12,
                'stage_height' => 640,
            ])
        );

        $this->assertArrayHasKey('content_payload.kind', $errors);
        $this->assertStringContainsString('EVIDENCE_MODEL_3D', $errors['content_payload.kind']);
    }

    public function test_a_model_3d_artifact_is_accepted_once_the_flag_is_on(): void
    {
        config()->set('evidence.features.model_3d', true);

        $normalized = $this->validator->validate(EvidenceType::Custom, ViewerStrategy::Artifact, [
            'kind' => 'model_3d',
            'model_asset_id' => 12,
            'stage_height' => 640,
        ]);

        $this->assertSame(
            ['kind' => 'model_3d', 'model_asset_id' => 12, 'stage_height' => 640],
            $normalized
        );
    }

    public function test_a_model_3d_artifact_validates_its_stage_height(): void
    {
        config()->set('evidence.features.model_3d', true);

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(EvidenceType::Custom, ViewerStrategy::Artifact, [
                'kind' => 'model_3d',
                'model_asset_id' => 12,
                'stage_height' => 9000,
            ])
        );

        $this->assertArrayHasKey('content_payload.stage_height', $errors);
    }

    public function test_it_collects_every_error_rather_than_stopping_at_the_first(): void
    {
        $blockA = $this->textBlock('b1', '<p>Hi</p>');
        $blockA['props']['align'] = 'nope';

        $blockB = $this->textBlock('b2', '<p>Hi</p>');
        $blockB['props']['size'] = 'enormous';

        $errors = $this->errorsFor(
            fn () => $this->validator->validate(EvidenceType::Document, ViewerStrategy::Paper, [
                'pages' => [['id' => 'p1', 'blocks' => [$blockA, $blockB]]],
            ])
        );

        $this->assertArrayHasKey('content_payload.pages.0.blocks.0.props.align', $errors);
        $this->assertArrayHasKey('content_payload.pages.0.blocks.1.props.size', $errors);
    }

    /**
     * @return array<string, mixed>
     */
    private function textBlock(string $id, string $html): array
    {
        return [
            'id' => $id,
            'type' => 'text',
            'props' => ['html' => $html, 'align' => 'left', 'size' => 'body'],
        ];
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<string>>  $rows
     * @return array<string, mixed>
     */
    private function tableBlock(string $id, array $headers, array $rows): array
    {
        return [
            'id' => $id,
            'type' => 'table',
            'props' => ['headers' => $headers, 'rows' => $rows, 'caption' => '', 'dense' => false],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function signatureBlock(string $id, int $signatureId): array
    {
        return [
            'id' => $id,
            'type' => 'signature',
            'props' => ['signature_id' => $signatureId, 'label' => '', 'verified' => false],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function stampBlock(string $id, string $text): array
    {
        return [
            'id' => $id,
            'type' => 'stamp',
            'props' => ['text' => $text, 'variant' => 'red', 'rotation' => -8, 'font_size' => 'auto'],
        ];
    }

    /**
     * @param  callable(): mixed  $callback
     * @param  array<string, string>  $expected
     */
    private function assertErrorsFor(callable $callback, array $expected): void
    {
        $errors = $this->errorsFor($callback);

        foreach ($expected as $path => $message) {
            $this->assertArrayHasKey($path, $errors);
            $this->assertSame($message, $errors[$path]);
        }
    }

    /**
     * Flattens the exception's message bag to a single message per path so the
     * assertions below can read as plain strings.
     *
     * @param  callable(): mixed  $callback
     * @return array<string, string>
     */
    private function errorsFor(callable $callback): array
    {
        try {
            $callback();
        } catch (ValidationException $exception) {
            return array_map(
                static fn (array $messages): string => implode(' ', $messages),
                $exception->errors()
            );
        }

        $this->fail('Expected a ValidationException.');
    }
}
