<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function ($request, \Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // Every API surface maps exceptions to a clean, predictable JSON
        // envelope with an explicit status code. Renderable closures in this
        // pipeline bypass Laravel's debug page entirely, so a stack trace can
        // never leak into the payload when APP_DEBUG=false; omitted classes
        // fall through to the framework's own (safe) formatting.
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (!$request->is('api/*') && !$request->expectsJson()) {
                return null;
            }

            if ($e instanceof ValidationException) {
                return response()->json([
                    'error' => 'Validation Failed',
                    'message' => $e->getMessage(),
                    'errors' => $e->errors(),
                ], $e->status);
            }

            if ($e instanceof ModelNotFoundException) {
                return response()->json([
                    'error' => 'Not Found',
                    'message' => 'The requested resource could not be found.',
                ], 404);
            }

            if ($e instanceof NotFoundHttpException) {
                return response()->json([
                    'error' => 'Not Found',
                    'message' => $e->getMessage() ?: 'The requested resource could not be found.',
                ], 404);
            }

            if ($e instanceof AuthenticationException) {
                return response()->json([
                    'error' => 'Unauthenticated',
                    'message' => $e->getMessage() ?: 'Authentication is required to perform this action.',
                ], 401);
            }

            if ($e instanceof AccessDeniedHttpException) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => $e->getMessage() ?: 'You do not have permission to perform this action.',
                ], 403);
            }

            return null;
        });
    })->create();
