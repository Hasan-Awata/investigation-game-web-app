<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\GameRoomController;
use App\Http\Controllers\VoteController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\InvestigationRequestController; 
use App\Http\Controllers\SuspectVerdictController;
use App\Http\Controllers\Admin\AdminCaseController;
use App\Http\Controllers\Admin\AdminPhaseController;
use App\Http\Controllers\Admin\AdminLevelController;
use App\Http\Controllers\Admin\AdminEvidenceController;
use App\Http\Controllers\Admin\AdminQuestionController;
use App\Http\Controllers\Admin\AdminSuspectController;
use App\Http\Controllers\Admin\AdminInvestigationRequestController; 
use App\Http\Middleware\IsAdmin; 

// Public Authentication Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected Gameplay Routes
Route::middleware('auth:sanctum')->group(function () {
    
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
    

    // Admin Dashboard Routes
    Route::middleware(['auth:sanctum', IsAdmin::class])->prefix('admin')->group(function () {
        Route::get('/cases', [AdminCaseController::class, 'index']); 
        Route::post('/cases', [AdminCaseController::class, 'store']);
        Route::delete('/cases/{case}', [AdminCaseController::class, 'destroy']);
        Route::post('/phases', [AdminPhaseController::class, 'store']);  
        Route::post('/levels', [AdminLevelController::class, 'store']);
        Route::post('/evidences', [AdminEvidenceController::class, 'store']);
        Route::post('/questions', [AdminQuestionController::class, 'store']);
        Route::post('/suspects', [AdminSuspectController::class, 'store']);
        Route::post('/investigation-requests', [AdminInvestigationRequestController::class, 'store']);        
    });
});