<?php

namespace Tests\Unit;

use App\Rules\EvidenceMetadataMatchesType;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class EvidenceBlockTypeParityTest extends TestCase
{
    public function test_backend_block_allowlists_match_frontend_contracts(): void
    {
        $rule = new ReflectionClass(EvidenceMetadataMatchesType::class);
        $backendDocTypes = $rule->getReflectionConstant('DOC_BLOCK_TYPES')->getValue();
        $backendTerminalTypes = $rule->getReflectionConstant('TERMINAL_BLOCK_TYPES')->getValue();

        $frontendRoot = dirname(__DIR__, 3).'/investigation-game-frontend/src/types/evidence';

        $this->assertSame($backendDocTypes, $this->readBlockTypes($frontendRoot.'/doc.ts', 'DOC_BLOCK_TYPES'));
        $this->assertSame($backendTerminalTypes, $this->readBlockTypes($frontendRoot.'/terminal.ts', 'TERMINAL_BLOCK_TYPES'));
    }

    /** @return list<string> */
    private function readBlockTypes(string $path, string $constant): array
    {
        $source = file_get_contents($path);
        $this->assertNotFalse($source, "Could not read frontend block contract at {$path}.");

        $pattern = '/export const '.preg_quote($constant, '/').':[^=]+?=\s*\[(.*?)\]\s*as const/s';
        $this->assertSame(1, preg_match($pattern, $source, $matches), "Could not find {$constant} in {$path}.");

        preg_match_all("/'([^']+)'/", $matches[1], $types);

        return $types[1];
    }
}
