<?php

namespace Tests\Support;

use ZipArchive;

/**
 * Builds in-memory case bundle ZIPs for feature tests.
 */
class CaseBundleFactory
{
    /**
     * @param  array<string, mixed>  $manifest  Decoded case.json payload.
     * @param  array<string, string>  $media  Map of archive entry path => raw bytes.
     * @return string Absolute path to the generated temp ZIP.
     */
    public static function build(array $manifest, array $media = []): string
    {
        $base = tempnam(sys_get_temp_dir(), 'case_bundle_');
        $zipPath = $base.'.zip';
        @unlink($base);

        $zip = new ZipArchive;

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Could not create the test case bundle.');
        }

        $zip->addFromString(
            'case.json',
            (string) json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );

        foreach ($media as $entry => $content) {
            $zip->addFromString($entry, $content);
        }

        $zip->close();

        return $zipPath;
    }

    /**
     * @return array<string, mixed> A minimal, valid manifest with the given overrides applied.
     */
    public static function minimalManifest(array $overrides = []): array
    {
        $manifest = [
            'format_version' => 1,
            'case' => [
                'title' => 'Factory Case',
                'story' => 'A case built by the test factory.',
                'XP_on_solve' => 100,
            ],
            'evidences' => [],
            'characters' => [],
            'investigation_requests' => [],
            'zones' => [
                [
                    'title' => 'Zone',
                    'order_index' => 1,
                    'levels' => [
                        [
                            'ref_id' => 'lvl_one',
                            'title' => 'Level',
                            'details' => 'Details',
                            'order_index' => 1,
                            'presentation_type' => 'location',
                            'nodes' => [
                                [
                                    'text' => 'Hello?',
                                    'choices' => [
                                        ['ref_id' => 'ch_one', 'text' => 'Hi.', 'outcomes' => [], 'requirements' => []],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        return array_replace_recursive($manifest, $overrides);
    }
}
