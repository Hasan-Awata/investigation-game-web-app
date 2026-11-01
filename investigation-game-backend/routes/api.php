<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\GameRoomController;
use App\Http\Controllers\VoteController;
use App\Http\Controllers\InvestigationRequestController;
use App\Http\Controllers\SuspectVerdictController;
use App\Http\Controllers\Admin\AdminCaseController;
use App\Http\Controllers\Admin\AdminZoneController;
use App\Http\Controllers\Admin\AdminLevelController;
use App\Http\Controllers\Admin\AdminEvidenceController;
use App\Http\Controllers\Admin\AdminQuestionController;
use App\Http\Controllers\Admin\AdminCharacterController;
use App\Http\Controllers\Admin\AdminInvestigationRequestController;
use App\Http\Controllers\Admin\AdminMediaController;
use App\Http\Middleware\IsAdmin;
use App\Http\Middleware\EnsureRoomParticipant;

Route::get('/login', function () {
    return response()->json(['error' => 'Unauthenticated', 'message' => 'Session expired. Please log in again.'], 401);
})->name('login');

// Public Authentication Routes
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');

// Protected Gameplay Routes
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);

    // Case Discovery
    Route::get('/cases', [CaseController::class, 'index']);

    // Room Management
    Route::post('/rooms', [GameRoomController::class, 'store']);
    Route::post('/rooms/restart', [GameRoomController::class, 'restart']);
    Route::post('/rooms/join', [GameRoomController::class, 'join']);

    // Room-scoped gameplay routes: participant-only (IDOR guard)
    Route::middleware([EnsureRoomParticipant::class])->group(function () {
        Route::post('/rooms/{room}/leave', [GameRoomController::class, 'leave']);
        Route::get('/rooms/{room}', [GameRoomController::class, 'show']);

        // Core Gameplay Loop
        Route::post('/rooms/{room}/questions/{question}/vote', [VoteController::class, 'store']);
        Route::delete('/rooms/{room}/questions/{question}/vote', [VoteController::class, 'clear']);
        Route::post('/rooms/{room}/levels/{level}/start', [GameRoomController::class, 'startLevel']);
        Route::post('/rooms/{room}/encounter-groups/{group}/join', [GameRoomController::class, 'joinEncounterGroup']);
        Route::post('/rooms/{room}/inspect', [GameRoomController::class, 'inspect']);
        Route::post('/rooms/{room}/suspects/submit', [SuspectVerdictController::class, 'store']);
        Route::post('/rooms/{room}/investigate', [InvestigationRequestController::class, 'store']);
    });

    // Admin Dashboard Routes (Protected by auth:sanctum from outer group + IsAdmin middleware)
    Route::middleware([IsAdmin::class])->prefix('admin')->group(function () {
        // GET (Fetch) Granular Endpoints
        Route::get('/cases', [AdminCaseController::class, 'index']);
        Route::get('/cases/{case}/export', [AdminCaseController::class, 'export']);
        Route::get('/cases/{case}/zones', [AdminZoneController::class, 'indexByCase']);
        Route::get('/zones/{zone}/levels', [AdminLevelController::class, 'indexByZone']);

        // POST (Create)
        Route::post('/cases', [AdminCaseController::class, 'store']);
        Route::post('/cases/import', [AdminCaseController::class, 'import']);
        Route::post('/zones', [AdminZoneController::class, 'store']);
        Route::post('/levels', [AdminLevelController::class, 'store']);
        Route::post('/evidences', [AdminEvidenceController::class, 'store']);
        Route::post('/questions', [AdminQuestionController::class, 'store']);
        Route::post('/characters', [AdminCharacterController::class, 'store']);
        Route::post('/investigation-requests', [AdminInvestigationRequestController::class, 'store']);

        // Media assets owned by a document block rather than an evidence column
        Route::post('/media/block-image', [AdminMediaController::class, 'storeBlockImage']);

        // PUT (Update)
        Route::put('/cases/{case}', [AdminCaseController::class, 'update']);
        Route::put('/zones/{zone}', [AdminZoneController::class, 'update']);
        Route::put('/levels/{level}', [AdminLevelController::class, 'update']);
        Route::put('/evidences/{evidence}', [AdminEvidenceController::class, 'update']);
        Route::put('/questions/{question}', [AdminQuestionController::class, 'update']);
        Route::put('/characters/{character}', [AdminCharacterController::class, 'update']);
        Route::put('/investigation-requests/{investigationRequest}', [AdminInvestigationRequestController::class, 'update']);

        // DELETE (Destroy)
        Route::delete('/cases/{case}', [AdminCaseController::class, 'destroy']);
        Route::delete('/zones/{zone}', [AdminZoneController::class, 'destroy']);
        Route::delete('/levels/{level}', [AdminLevelController::class, 'destroy']);
        Route::delete('/evidences/{evidence}', [AdminEvidenceController::class, 'destroy']);
        Route::delete('/questions/{question}', [AdminQuestionController::class, 'destroy']);
        Route::delete('/characters/{character}', [AdminCharacterController::class, 'destroy']);
        Route::delete('/investigation-requests/{investigationRequest}', [AdminInvestigationRequestController::class, 'destroy']);
    });
});
