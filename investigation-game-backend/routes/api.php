<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\GameRoomController;
use App\Http\Controllers\VoteController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\PersonaController;
use App\Http\Controllers\Admin\AdminCaseController;
use App\Http\Controllers\Admin\AdminLevelController;
use App\Http\Controllers\Admin\AdminEvidenceController;
use App\Http\Controllers\Admin\AdminQuestionController;
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
    
    // Persona Hint System
    Route::post('/rooms/{room}/hint', [PersonaController::class, 'store']);
    
Route::middleware(['auth:sanctum', IsAdmin::class])->prefix('admin')->group(function () {
    Route::get('/cases', [AdminCaseController::class, 'index']); 
    Route::post('/cases', [AdminCaseController::class, 'store']);
    Route::post('/levels', [AdminLevelController::class, 'store']);
    Route::post('/evidences', [AdminEvidenceController::class, 'store']);
    Route::post('/questions', [AdminQuestionController::class, 'store']);
});
});