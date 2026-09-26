<?php

use App\Enums\EvidenceDisk;

return [

    /*
    |--------------------------------------------------------------------------
    | Feature flags
    |--------------------------------------------------------------------------
    |
    | Gates evidence capabilities that are fully built out server side but not
    | necessarily exposed in the player client. Turning a flag on is a config
    | change only; no migration is required.
    |
    */

    'features' => [
        'model_3d' => (bool) env('EVIDENCE_MODEL_3D', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Paper viewer
    |--------------------------------------------------------------------------
    |
    | A4 at 96dpi, which is the canvas size the current UniversalViewer already
    | uses. Kept here so the backend can report it and the frontend can assert
    | against it rather than hard-coding the dimensions in two places.
    |
    */

    'paper' => [
        'width' => 794,
        'height' => 1123,
    ],

    /*
    |--------------------------------------------------------------------------
    | Hard limits
    |--------------------------------------------------------------------------
    |
    | Enforced by ContentPayloadValidator. These bound the amount of authored
    | content and the size of any string that reaches the players' browsers, so
    | a single oversized document cannot bloat every room payload that
    | references it.
    |
    */

    'limits' => [
        'max_pages' => 20,
        'max_blocks_per_page' => 40,
        'max_table_rows' => 200,
        'max_table_columns' => 20,
        'max_text_html_bytes' => 65536,
        'max_artifact_html_bytes' => 262144,
        'max_artifact_css_bytes' => 65536,
        'max_description_bytes' => 4096,
    ],

    /*
    |--------------------------------------------------------------------------
    | Storage
    |--------------------------------------------------------------------------
    |
    | Where evidence assets are written. Cloudinary is used for large media;
    | the public disk is the default so a dev environment needs no third-party
    | credentials.
    |
    */

    'storage' => [
        'default_disk' => EvidenceDisk::from(
            (string) env('EVIDENCE_DISK', EvidenceDisk::Public->value)
        ),
        'image_disk' => EvidenceDisk::from(
            (string) env('EVIDENCE_IMAGE_DISK', EvidenceDisk::Public->value)
        ),
        'audio_disk' => EvidenceDisk::from(
            (string) env('EVIDENCE_AUDIO_DISK', EvidenceDisk::Public->value)
        ),
    ],

    /*
    |--------------------------------------------------------------------------
    | Signatures
    |--------------------------------------------------------------------------
    |
    | The selectable signature SVGs shipped with the player client. Scanned from
    | the public path so adding a signature is a file drop, not a code change.
    |
    */

    'signatures' => [
        'path' => 'assets/signatures',
    ],

];
