<?php

return [
    'allow_legacy_paper' => (bool) env('CASE_BUNDLE_ALLOW_LEGACY_PAPER', true),
    'max_entries' => (int) env('CASE_BUNDLE_MAX_ENTRIES', 1000),
    'max_file_bytes' => (int) env('CASE_BUNDLE_MAX_FILE_BYTES', 100 * 1024 * 1024),
    'max_total_bytes' => (int) env('CASE_BUNDLE_MAX_TOTAL_BYTES', 200 * 1024 * 1024),
    'max_manifest_bytes' => (int) env('CASE_BUNDLE_MAX_MANIFEST_BYTES', 2 * 1024 * 1024),
];
