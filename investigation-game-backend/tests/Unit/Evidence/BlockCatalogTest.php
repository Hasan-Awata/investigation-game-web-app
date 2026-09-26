<?php

namespace Tests\Unit\Evidence;

use App\Enums\EvidenceBlockType;
use App\Services\Evidence\BlockCatalog;
use Tests\TestCase;

class BlockCatalogTest extends TestCase
{
    private BlockCatalog $catalog;

    protected function setUp(): void
    {
        parent::setUp();

        $this->catalog = new BlockCatalog;
    }

    public function test_the_catalog_covers_every_block_type_exactly_once(): void
    {
        $this->assertSame(
            array_column(EvidenceBlockType::cases(), 'value'),
            array_keys($this->catalog->all())
        );
    }

    public function test_the_documented_blocks_are_the_only_ones(): void
    {
        $this->assertSame(
            ['text', 'table', 'signature', 'stamp'],
            array_keys($this->catalog->all())
        );
    }

    public function test_every_field_declares_the_keys_the_admin_form_relies_on(): void
    {
        foreach ($this->catalog->all() as $type => $definition) {
            $this->assertSame($type, $definition['type']);
            $this->assertNotEmpty($definition['label']);

            foreach ($definition['fields'] as $field) {
                $this->assertArrayHasKey('name', $field, "{$type}.{$field['name']} has no name");
                $this->assertArrayHasKey('input', $field);
                $this->assertArrayHasKey('label', $field);
                $this->assertArrayHasKey('required', $field);

                if ($field['input'] === 'select') {
                    $this->assertNotEmpty(
                        $field['options'] ?? [],
                        "{$type}.{$field['name']} is a select with no options"
                    );
                }

                if ($field['input'] === 'number') {
                    $this->assertArrayHasKey('min', $field, "{$type}.{$field['name']} is unbounded below");
                    $this->assertArrayHasKey('max', $field, "{$type}.{$field['name']} is unbounded above");
                }
            }
        }
    }

    public function test_field_names_are_unique_within_a_block(): void
    {
        foreach ($this->catalog->all() as $type => $definition) {
            $names = array_column($definition['fields'], 'name');

            $this->assertSame(
                array_values(array_unique($names)),
                $names,
                "{$type} has duplicate prop names"
            );
        }
    }

    public function test_defaults_produce_one_key_per_declared_field(): void
    {
        foreach (EvidenceBlockType::cases() as $type) {
            $defaults = $this->catalog->defaults($type);
            $fields = array_column($this->catalog->fields($type), 'name');

            $this->assertSame($fields, array_keys($defaults), "{$type->value} defaults do not match its fields");
        }
    }

    public function test_a_select_default_is_always_one_of_its_own_options(): void
    {
        foreach (EvidenceBlockType::cases() as $type) {
            $defaults = $this->catalog->defaults($type);

            foreach ($this->catalog->fields($type) as $field) {
                if ($field['input'] !== 'select') {
                    continue;
                }

                $this->assertContains(
                    $defaults[$field['name']],
                    $field['options'],
                    "{$type->value}.{$field['name']} defaults outside its own options"
                );
            }
        }
    }

    public function test_field_lookup_returns_null_for_an_unknown_prop(): void
    {
        $this->assertNull($this->catalog->field(EvidenceBlockType::Text, 'nope'));
        $this->assertSame('html', $this->catalog->field(EvidenceBlockType::Text, 'html')['name']);
    }

    public function test_the_schema_endpoint_payload_is_a_list_of_block_definitions(): void
    {
        $schema = $this->catalog->schema();

        $this->assertCount(count(EvidenceBlockType::cases()), $schema);
        $this->assertSame(array_keys($this->catalog->all()), array_column($schema, 'type'));
    }

    public function test_free_text_fields_carry_a_byte_ceiling(): void
    {
        $limits = config('evidence.limits');

        $this->assertSame(
            $limits['max_text_html_bytes'],
            $this->catalog->field(EvidenceBlockType::Text, 'html')['max_bytes']
        );
        $this->assertArrayHasKey(
            'max_bytes',
            $this->catalog->field(EvidenceBlockType::Stamp, 'text')
        );
    }
}
