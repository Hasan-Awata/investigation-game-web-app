<?php

namespace Tests\Unit;

use App\Rules\EvidenceMetadataMatchesType;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class EvidenceMetadataMatchesTypeTest extends TestCase
{
    #[DataProvider('supportedBlocks')]
    public function test_supported_block_props_are_accepted(string $type, array $block): void
    {
        $key = $type === 'digital' ? 'terminal' : 'doc';
        $this->assertMetadataValid($type, [$key => ['blocks' => [$block]]]);
    }

    public static function supportedBlocks(): iterable
    {
        foreach ([
            'letterhead' => [], 'meta_grid' => ['rows' => [['label' => 'Name', 'value' => 'Jane']]],
            'prose' => ['html' => ''], 'two_column' => ['left' => [], 'right' => []],
            'table' => ['columns' => [['key' => 'amount', 'label' => 'Amount']], 'rows' => [['amount' => 10]]],
            'list' => ['items' => ['A']], 'signature_row' => ['columns' => [['caption' => 'Officer']]],
            'stamp' => ['text' => ''], 'barcode' => ['value' => '123'], 'watermark' => ['text' => 'Copy'],
            'rule' => [], 'spacer' => ['height' => 0], 'image' => ['url' => 'media/image.png'],
            'annotation' => ['text' => 'Note'], 'redaction' => [], 'diagram' => ['preset' => 'body_outline'],
        ] as $block => $props) {
            yield $block => ['document', ['type' => $block, 'props' => $props]];
        }
        foreach ([
            'prompt_line' => ['prompt' => '$', 'command' => '', 'output' => []],
            'output_stream' => ['lines' => ['OK']], 'status_banner' => ['text' => 'Done', 'tone' => 'ok'],
            'file_tree' => ['entries' => [['path' => 'a/b', 'kind' => 'file']]], 'spacer' => ['height' => 8],
        ] as $block => $props) {
            yield 'terminal '.$block => ['digital', ['type' => $block, 'props' => $props]];
        }
    }

    #[DataProvider('malformedBlocks')]
    public function test_malformed_block_props_and_nested_children_are_rejected(string $type, array $block): void
    {
        $key = $type === 'digital' ? 'terminal' : 'doc';
        $this->assertMetadataInvalid($type, [$key => ['blocks' => [$block]]]);
    }

    public static function malformedBlocks(): iterable
    {
        foreach (self::supportedBlocks() as $label => [$type, $block]) {
            foreach ([null, 'invalid', ['invalid']] as $props) {
                yield $label.' props '.json_encode($props) => [$type, ['type' => $block['type'], 'props' => $props]];
            }
            foreach ($block['props'] as $field => $value) {
                $invalid = $block;
                unset($invalid['props'][$field]);
                yield $label.' missing '.$field => [$type, $invalid];
                $invalid['props'][$field] = is_array($value) ? 'invalid' : ['invalid'];
                yield $label.' malformed '.$field => [$type, $invalid];
            }
        }
        foreach (['left', 'right'] as $column) {
            foreach ([['type' => 'prose'], ['type' => 'prompt_line', 'props' => []], ['type' => 'image', 'props' => ['url' => '']]] as $index => $child) {
                $props = ['left' => [], 'right' => []];
                $props[$column] = [$child];
                yield $column.' child '.$index => ['document', ['type' => 'two_column', 'props' => $props]];
            }
        }
        yield 'invalid list item' => ['document', ['type' => 'list', 'props' => ['items' => [['invalid']]]]];
        yield 'invalid table column' => ['document', ['type' => 'table', 'props' => ['columns' => [null], 'rows' => []]]];
        yield 'invalid file path' => ['digital', ['type' => 'file_tree', 'props' => ['entries' => [['path' => [], 'kind' => 'file']]]]];
    }

    public function test_document_metadata_requires_non_empty_doc_blocks(): void
    {
        $this->assertMetadataInvalid('document', ['doc' => ['blocks' => []]]);
        $this->assertMetadataValid('document', ['doc' => ['blocks' => [['type' => 'prose', 'props' => ['html' => 'Text']]]]]);
    }

    public function test_digital_metadata_requires_non_empty_terminal_blocks(): void
    {
        $this->assertMetadataInvalid('digital', ['terminal' => ['blocks' => []]]);
        $this->assertMetadataValid('digital', ['terminal' => ['blocks' => [['type' => 'prompt_line', 'props' => ['prompt' => '$', 'command' => 'ls', 'output' => []]]]]]);
    }

    public function test_malformed_json_and_disallowed_blocks_are_rejected(): void
    {
        $this->assertMetadataInvalid('document', '{bad json');
        $this->assertMetadataInvalid('document', ['doc' => ['blocks' => [['type' => 'prompt_line']]]]);
    }

    public function test_rule_requires_type_context(): void
    {
        $validator = Validator::make(['metadata' => ['doc' => ['blocks' => [['type' => 'prose']]]]], [
            'metadata' => [new EvidenceMetadataMatchesType],
        ]);

        $this->assertTrue($validator->fails());
        $this->assertSame('The evidence_type is required to validate metadata.', $validator->errors()->first('metadata'));
    }

    private function assertMetadataValid(string $type, mixed $metadata): void
    {
        $validator = Validator::make(['metadata' => $metadata], [
            'metadata' => [new EvidenceMetadataMatchesType($type)],
        ]);

        $this->assertFalse($validator->fails(), $validator->errors()->first('metadata'));
    }

    private function assertMetadataInvalid(string $type, mixed $metadata): void
    {
        $validator = Validator::make(['metadata' => $metadata], [
            'metadata' => [new EvidenceMetadataMatchesType($type)],
        ]);

        $this->assertTrue($validator->fails());
    }
}
