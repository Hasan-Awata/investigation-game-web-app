<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\GameRoomController;
use App\Http\Controllers\VoteController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\InvestigationRequestController; 
use App\Http\Controllers\SuspectVerdictController;
use App\Http\Controllers\WiretapController;
use App\Http\Controllers\Admin\AdminCaseController;
use App\Http\Controllers\Admin\AdminPhaseController;
use App\Http\Controllers\Admin\AdminLevelController;
use App\Http\Controllers\Admin\AdminEvidenceController;
use App\Http\Controllers\Admin\AdminQuestionController;
use App\Http\Controllers\Admin\AdminSuspectController;
use App\Http\Controllers\Admin\AdminVictimController;
use App\Http\Controllers\Admin\AdminInvestigationRequestController; 
use App\Http\Middleware\IsAdmin; 

Route::get('/login', function () {
    return response()->json(['error' => 'Unauthenticated', 'message' => 'Session expired. Please log in again.'], 401);
})->name('login');

// Public Authentication Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

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
    Route::post('/rooms/join', [GameRoomController::class, 'join']);
    Route::get('/rooms/{room}', [GameRoomController::class, 'show']);
    
    // Core Gameplay Loop
    Route::post('/rooms/{room}/questions/{question}/vote', [VoteController::class, 'store']);
    Route::post('/rooms/{room}/submit', [AssessmentController::class, 'store']);
    Route::post('/rooms/{room}/levels/{level}/start', [GameRoomController::class, 'startLevel']);
    Route::post('/rooms/{room}/suspects/submit', [SuspectVerdictController::class, 'store']);
    Route::post('/rooms/{room}/investigate', [InvestigationRequestController::class, 'store']);
    Route::post('/rooms/{room}/questions/{question}/wiretap/play', [WiretapController::class, 'play']);    

    // Admin Dashboard Routes (Protected by auth:sanctum from outer group + IsAdmin middleware)
    Route::middleware([IsAdmin::class])->prefix('admin')->group(function () {
        // GET (Fetch) Granular Endpoints
        Route::get('/cases', [AdminCaseController::class, 'index']); 
        Route::get('/cases/{caseId}/phases', [AdminPhaseController::class, 'indexByCase']);
        Route::get('/phases/{phaseId}/levels', [AdminLevelController::class, 'indexByPhase']);
        
        // POST (Create)
        Route::post('/cases', [AdminCaseController::class, 'store']);
        Route::post('/phases', [AdminPhaseController::class, 'store']);  
        Route::post('/levels', [AdminLevelController::class, 'store']);
        Route::post('/evidences', [AdminEvidenceController::class, 'store']);
        Route::post('/questions', [AdminQuestionController::class, 'store']);
        Route::post('/suspects', [AdminSuspectController::class, 'store']);
        Route::post('/victims', [AdminVictimController::class, 'store']);
        Route::post('/investigation-requests', [AdminInvestigationRequestController::class, 'store']);        
        
        // PUT (Update)
        Route::put('/cases/{case}', [AdminCaseController::class, 'update']);
        Route::put('/phases/{phase}', [AdminPhaseController::class, 'update']);
        Route::put('/levels/{level}', [AdminLevelController::class, 'update']);
        Route::put('/evidences/{evidence}', [AdminEvidenceController::class, 'update']);
        Route::put('/questions/{question}', [AdminQuestionController::class, 'update']);
        Route::put('/suspects/{suspect}', [AdminSuspectController::class, 'update']);
        Route::put('/victims/{victim}', [AdminVictimController::class, 'update']);
        Route::put('/investigation-requests/{request}', [AdminInvestigationRequestController::class, 'update']);
        
        // DELETE (Destroy)
        Route::delete('/cases/{case}', [AdminCaseController::class, 'destroy']);
        Route::delete('/phases/{phase}', [AdminPhaseController::class, 'destroy']);
        Route::delete('/levels/{level}', [AdminLevelController::class, 'destroy']);
        Route::delete('/evidences/{evidence}', [AdminEvidenceController::class, 'destroy']);
        Route::delete('/questions/{question}', [AdminQuestionController::class, 'destroy']);
        Route::delete('/suspects/{suspect}', [AdminSuspectController::class, 'destroy']);
        Route::delete('/victims/{victim}', [AdminVictimController::class, 'destroy']);
        Route::delete('/investigation-requests/{request}', [AdminInvestigationRequestController::class, 'destroy']);
    });
});