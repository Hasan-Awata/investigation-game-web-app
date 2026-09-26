<?php

use App\Exceptions\EvidenceAssetWriteFailed;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // A failed asset write is a storage fault, not a bad request, so it is
        // reported as a 500. The disk path stays in the log; the client only
        // learns that the upload did not land.
        $exceptions->render(function (EvidenceAssetWriteFailed $e, Request $request) {
            report($e);

            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'The asset could not be stored. Please retry.',
                ], 500);
            }

            return null;
        });
    })->create();
