<?php

use App\Support\SharedDocumentAssets;
use Illuminate\Support\Facades\Route;

Route::get('/assets/signatures/{filename}', function (string $filename) {
    $path = SharedDocumentAssets::legacySignaturePath($filename);
    abort_unless($path !== null && is_file(public_path($path)), 404);

    return redirect($path, 301);
});
