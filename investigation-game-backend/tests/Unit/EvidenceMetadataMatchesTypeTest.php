<?php

namespace Tests\Unit;

use App\Rules\EvidenceMetadataMatchesType;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class EvidenceMetadataMatchesTypeTest extends TestCase
{
    public function test_document_metadata_requires_non_empty_doc_blocks(): void
    {
        $this->assertMetadataInvalid('document', ['doc' => ['blocks' => []]]);
        $this->assertMetadataValid('document', ['doc' => ['blocks' => [['type' => 'prose']]]]);
    }

    public function test_digital_metadata_requires_non_empty_terminal_blocks(): void
    {
        $this->assertMetadataInvalid('digital', ['terminal' => ['blocks' => []]]);
        $this->assertMetadataValid('digital', ['terminal' => ['blocks' => [['type' => 'prompt_line']]]]);
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
